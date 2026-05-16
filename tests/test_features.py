import pandas as pd
import numpy as np
from ml.features import engineer_features

def test_engineer_features():
    dates = pd.date_range('2023-01-01', periods=100)
    data = {'close': np.random.randn(100).cumsum() + 100}
    df = pd.DataFrame(data, index=dates)
    
    featured_df = engineer_features(df)
    
    assert 'SMA_20' in featured_df.columns
    assert 'SMA_50' in featured_df.columns
    assert 'EMA_12' in featured_df.columns
    assert 'RSI_14' in featured_df.columns
    assert 'Daily_Return' in featured_df.columns
    assert 'Volatility_5' in featured_df.columns
    assert 'Target_Close' in featured_df.columns
    
    assert featured_df['Target_Close'].iloc[0] == featured_df['close'].iloc[1]
