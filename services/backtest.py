import pandas as pd
import numpy as np
from ml.features import engineer_features

def compute_backtest(df, strategy_name='sma_crossover'):
    if len(df) < 50:
        return None

    # Ensure clean numeric columns
    df['close'] = pd.to_numeric(df['close'], errors='coerce')
    df = df.dropna(subset=['close']).copy()

    # Engineer indicators
    df['SMA_20'] = df['close'].rolling(window=20).mean()
    df['SMA_50'] = df['close'].rolling(window=50).mean()
    
    # Compute RSI
    delta = df['close'].diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
    rs = gain / (loss + 1e-9)
    df['RSI_14'] = 100 - (100 / (1 + rs))

    df = df.dropna(subset=['SMA_50', 'RSI_14']).copy()
    if len(df) < 10:
        return None

    initial_cash = 100000.0
    cash = initial_cash
    shares = 0.0
    trades = []
    equity_curve = []
    
    position_open_price = 0.0

    # Backtest simulation loop
    for i, row in enumerate(df.itertuples()):
        date_str = str(row.date)
        close_price = float(row.close)
        
        # Determine signals
        buy_signal = False
        sell_signal = False
        
        if strategy_name == 'sma_crossover':
            # SMA_20 crosses above SMA_50
            if i > 0:
                prev_row = df.iloc[i - 1]
                if prev_row['SMA_20'] <= prev_row['SMA_50'] and row.SMA_20 > row.SMA_50:
                    buy_signal = True
                elif prev_row['SMA_20'] >= prev_row['SMA_50'] and row.SMA_20 < row.SMA_50:
                    sell_signal = True
        elif strategy_name == 'rsi_breakout':
            # RSI drops below 30 (Buy) or rises above 70 (Sell)
            if row.RSI_14 < 30:
                buy_signal = True
            elif row.RSI_14 > 70:
                sell_signal = True

        # Execute signals
        if buy_signal and shares == 0:
            shares = cash / close_price
            cash = 0.0
            position_open_price = close_price
            trades.append({
                "type": "BUY",
                "date": date_str,
                "price": close_price
            })
        elif sell_signal and shares > 0:
            proceeds = shares * close_price
            profit = proceeds - (shares * position_open_price)
            cash = proceeds
            shares = 0.0
            trades.append({
                "type": "SELL",
                "date": date_str,
                "price": close_price,
                "profit": profit
            })

        # Record daily equity value
        current_value = cash + (shares * close_price)
        equity_curve.append({
            "date": date_str,
            "value": round(current_value, 2)
        })

    # Close any open positions at final close
    final_close = float(df.iloc[-1]['close'])
    if shares > 0:
        proceeds = shares * final_close
        profit = proceeds - (shares * position_open_price)
        cash = proceeds
        shares = 0.0
        trades.append({
            "type": "SELL",
            "date": str(df.iloc[-1]['date']),
            "price": final_close,
            "profit": profit
        })
        equity_curve[-1]['value'] = round(cash, 2)

    total_trades = len(trades) // 2
    sell_trades = [t for t in trades if t['type'] == 'SELL']
    winning_trades = sum(1 for t in sell_trades if t.get('profit', 0) > 0)
    
    win_rate = (winning_trades / len(sell_trades) * 100) if len(sell_trades) > 0 else 0.0
    final_equity = cash
    total_return = ((final_equity - initial_cash) / initial_cash) * 100

    return {
        "initial_capital": initial_cash,
        "final_capital": round(final_equity, 2),
        "total_return_pct": round(total_return, 2),
        "total_trades": total_trades,
        "win_rate_pct": round(win_rate, 2),
        "equity_curve": equity_curve,
        "trades": sell_trades # Return list of closed trades for table
    }
