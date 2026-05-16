import os
import json
import joblib
import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from ml.features import engineer_features

MODEL_DIR = os.path.join(os.path.dirname(__file__), '..', 'models_data')
os.makedirs(MODEL_DIR, exist_ok=True)

FEATURES = ['SMA_20', 'SMA_50', 'EMA_12', 'RSI_14', 'Daily_Return', 'Volatility_5', 'Lag_1_Close', 'Lag_5_Close']

def get_model_path(ticker, model_name='linear_regression'):
    return os.path.join(MODEL_DIR, f"{ticker}_{model_name}_model.joblib")

def get_scaler_path(ticker, model_name='linear_regression'):
    return os.path.join(MODEL_DIR, f"{ticker}_{model_name}_scaler.joblib")

def get_metrics_path(ticker, model_name='linear_regression'):
    return os.path.join(MODEL_DIR, f"{ticker}_{model_name}_metrics.json")

def train_model(ticker, df, model_name='linear_regression'):
    df = engineer_features(df)
    df = df.dropna()
    
    if len(df) < 50:
        return None
        
    X = df[FEATURES]
    y = df['Target_Close']
    
    split_idx = int(len(df) * 0.8)
    X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
    y_train, y_test = y.iloc[:split_idx], y.iloc[split_idx:]
    
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    if model_name == 'random_forest':
        from sklearn.ensemble import RandomForestRegressor
        model = RandomForestRegressor(n_estimators=100, random_state=42)
    elif model_name == 'xgboost':
        try:
            from xgboost import XGBRegressor
            model = XGBRegressor(n_estimators=100, learning_rate=0.08, max_depth=4, random_state=42)
        except ImportError:
            from sklearn.ensemble import GradientBoostingRegressor
            model = GradientBoostingRegressor(n_estimators=100, learning_rate=0.08, max_depth=4, random_state=42)
    else:
        model = LinearRegression()
        
    model.fit(X_train_scaled, y_train)
    
    predictions = model.predict(X_test_scaled)
    mae = mean_absolute_error(y_test, predictions)
    rmse = np.sqrt(mean_squared_error(y_test, predictions))
    r2 = r2_score(y_test, predictions)
    
    residuals = y_test - predictions
    std_dev_residuals = np.std(residuals)
    
    joblib.dump(model, get_model_path(ticker, model_name))
    joblib.dump(scaler, get_scaler_path(ticker, model_name))
    
    metrics = {
        "mae": float(mae),
        "rmse": float(rmse),
        "r2": float(r2),
        "std_dev_residuals": float(std_dev_residuals),
        "trained_on": len(X_train),
        "samples": len(df)
    }
    
    with open(get_metrics_path(ticker, model_name), 'w') as f:
        json.dump(metrics, f)
        
    return metrics

def get_model_metrics(ticker, model_name='linear_regression'):
    metrics_path = get_metrics_path(ticker, model_name)
    if os.path.exists(metrics_path):
        with open(metrics_path, 'r') as f:
            return json.load(f)
    return None

def predict_next_day(ticker, df, model_name='linear_regression'):
    model_path = get_model_path(ticker, model_name)
    scaler_path = get_scaler_path(ticker, model_name)
    metrics = get_model_metrics(ticker, model_name)
    
    if not os.path.exists(model_path) or not os.path.exists(scaler_path) or not metrics:
        # Try to train the model first
        metrics = train_model(ticker, df, model_name)
        if not metrics:
            return None
            
    model = joblib.load(model_path)
    scaler = joblib.load(scaler_path)
    
    df_feat = engineer_features(df)
    last_row = df_feat.ffill().iloc[-1:]
    
    if last_row[FEATURES].isna().any().any():
        return None
        
    X_latest = last_row[FEATURES]
    X_latest_scaled = scaler.transform(X_latest)
    
    prediction = model.predict(X_latest_scaled)[0]
    
    return {
        "predicted": float(prediction),
        "lower": float(prediction - metrics["std_dev_residuals"]),
        "upper": float(prediction + metrics["std_dev_residuals"]),
        "mae": metrics["mae"],
        "rmse": metrics["rmse"],
        "r2": metrics["r2"]
    }
