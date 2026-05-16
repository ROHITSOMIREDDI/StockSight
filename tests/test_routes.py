import pytest
from app import create_app

@pytest.fixture
def client():
    app = create_app()
    app.config.update({
        "TESTING": True,
    })
    with app.test_client() as client:
        yield client

def test_api_stock_invalid(client):
    response = client.get('/api/stock/INVALID_123*')
    assert response.status_code == 400 or response.status_code == 404

def test_api_search(client):
    response = client.get('/api/search?q=apple')
    assert response.status_code == 200
