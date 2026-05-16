import re
from flask import Blueprint, jsonify, request
from services.stock import get_quote, get_history, search_ticker, get_news

stock_bp = Blueprint('stock', __name__)

def sanitize_ticker(ticker):
    return re.sub(r'[^A-Z0-9.\-^]', '', str(ticker).upper())

@stock_bp.route('/stock/<ticker>', methods=['GET'])
def api_get_stock(ticker):
    ticker = sanitize_ticker(ticker)
    if not ticker:
        return jsonify({"status": "error", "message": "Invalid ticker"}), 400
        
    data = get_quote(ticker)
    if not data:
        return jsonify({"status": "error", "message": "Ticker not found or data unavailable", "ticker": ticker}), 404
        
    return jsonify(data)

@stock_bp.route('/history/<ticker>', methods=['GET'])
def api_get_history(ticker):
    ticker = sanitize_ticker(ticker)
    period = request.args.get('period', '1y')
    valid_periods = ['1w', '1m', '3m', '1y', '5y']
    if period not in valid_periods:
        period = '1y'
        
    data = get_history(ticker, period)
    if not data:
        return jsonify({"status": "error", "message": "History not found", "ticker": ticker}), 404
        
    return jsonify(data)

@stock_bp.route('/search', methods=['GET'])
def api_search():
    query = request.args.get('q', '').strip()
    if not query:
        return jsonify([])
        
    results = search_ticker(query)
    return jsonify(results)

@stock_bp.route('/news/<ticker>', methods=['GET'])
def api_news(ticker):
    ticker = sanitize_ticker(ticker)
    if not ticker:
        return jsonify({"status": "error", "message": "Invalid ticker"}), 400
        
    news = get_news(ticker)
    return jsonify(news)

@stock_bp.route('/alerts', methods=['POST'])
def create_alert():
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from models import PriceAlert
    from config import Config

    data = request.get_json() or {}
    ticker = sanitize_ticker(data.get('ticker', ''))
    target_price = data.get('target_price')
    condition = data.get('condition', '').upper()
    email = data.get('email', '').strip()

    if not ticker or target_price is None or condition not in ['ABOVE', 'BELOW'] or not email:
        return jsonify({"status": "error", "message": "Missing or invalid parameters"}), 400

    try:
        target_price = float(target_price)
    except ValueError:
        return jsonify({"status": "error", "message": "Invalid target price"}), 400

    try:
        engine = create_engine(Config.DATABASE_URL)
        Session = sessionmaker(bind=engine)
        session = Session()

        alert = PriceAlert(
            ticker=ticker,
            target_price=target_price,
            condition=condition,
            email=email,
            is_triggered=0
        )
        session.add(alert)
        session.commit()
        session.close()
        return jsonify({"status": "success", "message": f"Alert registered for {ticker} {condition.lower()} ₹{target_price:.2f}"})
    except Exception:
        return jsonify({"status": "error", "message": "Failed to register alert"}), 500

@stock_bp.route('/alerts/<email>', methods=['GET'])
def get_alerts_by_email(email):
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from models import PriceAlert
    from config import Config

    try:
        engine = create_engine(Config.DATABASE_URL)
        Session = sessionmaker(bind=engine)
        session = Session()

        alerts = session.query(PriceAlert).filter(
            PriceAlert.email == email
        ).order_by(PriceAlert.created_at.desc()).all()

        result = []
        for alert in alerts:
            result.append({
                "id": alert.id,
                "ticker": alert.ticker,
                "target_price": alert.target_price,
                "condition": alert.condition,
                "is_triggered": alert.is_triggered,
                "created_at": alert.created_at.strftime('%Y-%m-%d %H:%M:%S')
            })

        session.close()
        return jsonify(result)
    except Exception:
        return jsonify({"status": "error", "message": "Failed to fetch alerts"}), 500

