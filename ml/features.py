import pandas as pd
import numpy as np

def compute_sma(series, window):
    return series.rolling(window=window).mean()

def compute_ema(series, span):
    return series.ewm(span=span, adjust=False).mean()

def compute_rsi(series, window=14):
    delta = series.diff()
    
    # Use wilder's smoothing method for RSI
    gain = delta.where(delta > 0, 0)
    loss = -delta.where(delta < 0, 0)
    
    avg_gain = gain.rolling(window=window, min_periods=1).mean()
    avg_loss = loss.rolling(window=window, min_periods=1).mean()
    
    # Calculate RS, avoid division by zero
    rs = avg_gain / avg_loss.replace(0, np.nan)
    rsi = 100 - (100 / (1 + rs))
    # Fill cases where loss was zero with 100
    rsi = rsi.fillna(100)
    
    return rsi

def compute_returns(series):
    return series.pct_change()

def compute_volatility(returns_series, window=5):
    return returns_series.rolling(window=window).std()

def engineer_features(df):
    """
    Given a dataframe with 'close' column, add technical indicators:
    SMA-20, SMA-50, EMA-12, RSI-14, daily return, 5-day rolling volatility.
    """
    df = df.copy()
    close = df['close']
    
    df['SMA_20'] = compute_sma(close, 20)
    df['SMA_50'] = compute_sma(close, 50)
    df['EMA_12'] = compute_ema(close, 12)
    df['RSI_14'] = compute_rsi(close, 14)
    df['Daily_Return'] = compute_returns(close)
    df['Volatility_5'] = compute_volatility(df['Daily_Return'], 5)
    
    df['Lag_1_Close'] = close.shift(1)
    df['Lag_5_Close'] = close.shift(5)
    
    df['Target_Close'] = close.shift(-1)
    
    return df
