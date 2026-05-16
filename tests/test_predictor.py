import pandas as pd
import numpy as np
from ml.predictor import train_model

def test_train_model():
    dates = pd.date_range('2023-01-01', periods=200)
    data = {'close': np.random.randn(200).cumsum() + 100}
    df = pd.DataFrame(data, index=dates)
    
    metrics = train_model('TEST', df)
    
    assert metrics is not None
    assert 'mae' in metrics
    assert 'rmse' in metrics
    assert 'r2' in metrics
    assert 'std_dev_residuals' in metrics
