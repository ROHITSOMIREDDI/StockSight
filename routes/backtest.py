import pandas as pd
from flask import Blueprint, jsonify, request
from services.stock import get_history
from routes.stock import sanitize_ticker
from services.backtest import compute_backtest

from routes.auth import login_required

backtest_bp = Blueprint('backtest', __name__)

@backtest_bp.route('/backtest/<ticker>', methods=['GET'])
@login_required
def api_backtest(ticker):
    ticker = sanitize_ticker(ticker)
    strategy_name = request.args.get('strategy', 'sma_crossover')
    period = request.args.get('period', '1y')
    
    # Fetch historical data
    history = get_history(ticker, period=period)
    if not history or len(history) < 50:
        return jsonify({
            "status": "error",
            "message": "Not enough historical data to run backtest. Need at least 50 days.",
            "ticker": ticker
        }), 400
        
    df = pd.DataFrame(history)
    results = compute_backtest(df, strategy_name)
    
    if not results:
        return jsonify({
            "status": "error",
            "message": "Backtest simulation failed. Insufficient trading signals found.",
            "ticker": ticker
        }), 500
        
    return jsonify(results)
