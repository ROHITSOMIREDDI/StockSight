import yfinance as yf
import requests
from services.cache import get_cache, set_cache
from config import Config

def get_quote(ticker):
    cache_key = f"stock:quote:{ticker}"
    cached = get_cache(cache_key)
    if cached:
        return cached

    try:
        stock = yf.Ticker(ticker)
        # Using fast_info which is much faster and less prone to rate limiting
        info = stock.fast_info
        if not info or 'lastPrice' not in info:
            return None
            
        price = info['lastPrice']
        prev_close = info['previousClose']
        change = price - prev_close
        pct = (change / prev_close) * 100 if prev_close else 0
        
        data = {
            "price": price,
            "change": change,
            "pct": pct,
            "mktcap": info.get('marketCap'),
            "high52": info.get('yearHigh'),
            "low52": info.get('yearLow'),
            "open": info.get('open'),
            "dayHigh": info.get('dayHigh'),
            "dayLow": info.get('dayLow'),
            "prevClose": prev_close
        }

        # Check threshold alerts in a background thread (non-blocking)
        import threading
        threading.Thread(target=check_alerts, args=(ticker, price)).start()

        set_cache(cache_key, data, ttl=Config.CACHE_TTL_QUOTE)
        return data
    except Exception as e:
        print(f"Error fetching quote for {ticker}: {e}")
        return None

def get_history(ticker, period="1y"):
    cache_key = f"stock:history:{ticker}:{period}"
    cached = get_cache(cache_key)
    if cached:
        return cached

    try:
        stock = yf.Ticker(ticker)
        yf_period = period
        if period == '1w':
            yf_period = '5d'
        elif period == '1m':
            yf_period = '1mo'
        elif period == '3m':
            yf_period = '3mo'
        elif period == '1y':
            yf_period = '1y'
        elif period == '5y':
            yf_period = '5y'
        elif period == '2y':
            yf_period = '2y'
            
        hist = stock.history(period=yf_period)
        if hist.empty:
            return None
            
        # Compute technical indicators
        from ml.features import compute_sma, compute_ema, compute_rsi
        
        close_series = hist['Close']
        
        # Bollinger Bands (20-day SMA, 2-std dev)
        bb_middle = compute_sma(close_series, 20)
        bb_std = close_series.rolling(window=20).std()
        bb_upper = bb_middle + (bb_std * 2)
        bb_lower = bb_middle - (bb_std * 2)
        
        # RSI-14
        rsi_14 = compute_rsi(close_series, 14)
        
        # MACD (12-day EMA, 26-day EMA, 9-day signal)
        ema_12 = compute_ema(close_series, 12)
        ema_26 = compute_ema(close_series, 26)
        macd_line = ema_12 - ema_26
        macd_signal = compute_ema(macd_line, 9)
        macd_hist = macd_line - macd_signal
            
        result = []
        for index, row in hist.iterrows():
            idx_loc = hist.index.get_loc(index)
            
            def clean_val(v):
                import numpy as np
                import pandas as pd
                if pd.isna(v) or np.isnan(v) or np.isinf(v):
                    return None
                return float(v)
                
            result.append({
                "date": index.strftime('%Y-%m-%d'),
                "open": clean_val(row.get('Open')),
                "high": clean_val(row.get('High')),
                "low": clean_val(row.get('Low')),
                "close": clean_val(row.get('Close')),
                "volume": clean_val(row.get('Volume')),
                "bb_upper": clean_val(bb_upper.iloc[idx_loc]),
                "bb_middle": clean_val(bb_middle.iloc[idx_loc]),
                "bb_lower": clean_val(bb_lower.iloc[idx_loc]),
                "rsi": clean_val(rsi_14.iloc[idx_loc]),
                "macd_line": clean_val(macd_line.iloc[idx_loc]),
                "macd_signal": clean_val(macd_signal.iloc[idx_loc]),
                "macd_hist": clean_val(macd_hist.iloc[idx_loc])
            })
            
        set_cache(cache_key, result, ttl=Config.CACHE_TTL_HISTORY)
        return result
    except Exception as e:
        print(f"Error fetching history for {ticker}: {e}")
        return None

def search_ticker(query):
    cache_key = f"stock:search:{query}"
    cached = get_cache(cache_key)
    if cached:
        return cached

    try:
        url = f"https://query2.finance.yahoo.com/v1/finance/search?q={query}&quotesCount=20&newsCount=0"
        headers = {'User-Agent': 'Mozilla/5.0'}
        response = requests.get(url, headers=headers)
        if response.status_code == 200:
            data = response.json()
            quotes = data.get('quotes', [])
            result = []
            for q in quotes:
                symbol = q.get('symbol', '')
                if 'quoteType' in q and q['quoteType'] in ['EQUITY', 'ETF']:
                    # Filter for Indian stocks (NSE or BSE)
                    if symbol.endswith('.NS') or symbol.endswith('.BO'):
                        result.append({
                            "ticker": symbol,
                            "name": q.get('shortname', q.get('longname')),
                            "exchange": q.get('exchDisp')
                        })
            # Limit to 10 results
            result = result[:10]
            set_cache(cache_key, result, ttl=86400) # 24 hours
            return result
        return []
    except Exception as e:
        print(f"Error searching ticker {query}: {e}")
        return []

def get_news(ticker):
    cache_key = f"stock:news:{ticker}"
    cached = get_cache(cache_key)
    if cached:
        return cached

    try:
        from textblob import TextBlob
        stock = yf.Ticker(ticker)
        news = stock.news
        if not news:
            return []
            
        result = []
        for n in news[:8]:  # Limit to 8 articles
            content = n.get('content') or n
            provider = content.get('provider', {})
            
            # Extract link
            link = ''
            if content.get('clickThroughUrl'):
                link = content['clickThroughUrl'].get('url', '')
            elif content.get('canonicalUrl'):
                link = content['canonicalUrl'].get('url', '')
            else:
                link = content.get('link', '')
                
            # Extract publisher
            publisher = provider.get('displayName') if isinstance(provider, dict) else content.get('publisher', '')
            
            # Extract timestamp
            pub_date = content.get('pubDate')
            
            title = content.get('title') or ''
            # Compute Sentiment
            try:
                polarity = TextBlob(title).sentiment.polarity
                if polarity > 0.05:
                    sent_label = 'POSITIVE'
                elif polarity < -0.05:
                    sent_label = 'NEGATIVE'
                else:
                    sent_label = 'NEUTRAL'
            except Exception:
                polarity = 0.0
                sent_label = 'NEUTRAL'
                
            result.append({
                "title": title,
                "publisher": publisher,
                "link": link,
                "providerPublishTime": pub_date or content.get('providerPublishTime'),
                "sentiment_score": polarity,
                "sentiment_label": sent_label
            })
            
        set_cache(cache_key, result, ttl=Config.CACHE_TTL_QUOTE) # Using quote TTL (5 min) for fresh news
        return result
    except Exception as e:
        print(f"Error fetching news for {ticker}: {e}")
        return []

def check_alerts(ticker, current_price):
    from flask import current_app
    from flask_mail import Message
    from extensions import mail
    from models import PriceAlert
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker

    # Need app context to send emails via Flask-Mail
    if not current_app:
        return

    try:
        engine = create_engine(Config.DATABASE_URL)
        Session = sessionmaker(bind=engine)
        session = Session()
        
        alerts = session.query(PriceAlert).filter(
            PriceAlert.ticker == ticker,
            PriceAlert.is_triggered == 0
        ).all()

        for alert in alerts:
            trigger = False
            cond = alert.condition.upper()
            if cond == 'ABOVE' and current_price >= alert.target_price:
                trigger = True
            elif cond == 'BELOW' and current_price <= alert.target_price:
                trigger = True

            if trigger:
                # Check daily limit (max 5 per user/email per day)
                from datetime import datetime, time
                from models import AlertLog
                
                today_start = datetime.combine(datetime.utcnow().date(), time.min)
                alert_count = session.query(AlertLog).filter(
                    AlertLog.email == alert.email,
                    AlertLog.sent_at >= today_start
                ).count()
                
                if alert_count >= 5:
                    print(f"Daily alert limit reached for {alert.email}. Skipping.")
                    continue

                # Mark as triggered and log it
                alert.is_triggered = 1
                new_log = AlertLog(email=alert.email, ticker=ticker)
                session.add(new_log)
                session.commit()

                # Send email
                msg = Message(
                    subject=f"StockSight Alert: {ticker} has crossed your target price!",
                    recipients=[alert.email],
                    body=f"Hello,\n\nThis is an automated alert from StockSight.\n\n"
                         f"The stock {ticker} is currently trading at ₹{current_price:,.2f}, which has crossed your target price of ₹{alert.target_price:,.2f} ({alert.condition.lower()}).\n\n"
                         f"Best regards,\nStockSight Team"
                )
                try:
                    mail.send(msg)
                    print(f"Alert email sent successfully to {alert.email} for {ticker}")
                except Exception as mail_err:
                    print(f"Failed to send email alert to {alert.email} for {ticker}: {mail_err}")
        
        session.close()
    except Exception as e:
        print(f"Error checking active alerts for {ticker}: {e}")

