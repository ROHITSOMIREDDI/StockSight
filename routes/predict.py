import pandas as pd
from flask import Blueprint, jsonify, request
from ml.predictor import predict_next_day, get_model_metrics
from services.stock import get_history
from routes.stock import sanitize_ticker
from services.cache import get_cache, set_cache
from config import Config

from extensions import limiter

from routes.auth import login_required

predict_bp = Blueprint('predict', __name__)

@predict_bp.route('/predict/<ticker>', methods=['GET'])
@limiter.limit("10 per minute")
@login_required
def api_predict(ticker):
    ticker = sanitize_ticker(ticker)
    model_name = request.args.get('model', 'linear_regression')
    
    cache_key = f"stock:predict:{ticker}:{model_name}"
    cached = get_cache(cache_key)
    if cached:
        return jsonify(cached)
        
    history = get_history(ticker, period='2y')
    if not history or len(history) < 50:
        return jsonify({"status": "error", "message": "Not enough historical data to predict", "ticker": ticker}), 400
        
    df = pd.DataFrame(history)
    prediction_data = predict_next_day(ticker, df, model_name)
    
    if not prediction_data:
        return jsonify({"status": "error", "message": "Prediction failed", "ticker": ticker}), 500
        
    set_cache(cache_key, prediction_data, ttl=Config.CACHE_TTL_HISTORY)
    return jsonify(prediction_data)

@predict_bp.route('/model/metrics/<ticker>', methods=['GET'])
@login_required
def api_metrics(ticker):
    ticker = sanitize_ticker(ticker)
    model_name = request.args.get('model', 'linear_regression')
    metrics = get_model_metrics(ticker, model_name)
    if not metrics:
        return jsonify({"status": "error", "message": "Model not trained for this ticker"}), 404
        
    return jsonify(metrics)
