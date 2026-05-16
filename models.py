from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Date, DateTime, BigInteger
from sqlalchemy.orm import declarative_base

Base = declarative_base()

class PriceAlert(Base):
    __tablename__ = 'price_alerts'

    id = Column(Integer, primary_key=True, autoincrement=True)
    ticker = Column(String(10), nullable=False, index=True)
    target_price = Column(Float, nullable=False)
    condition = Column(String(10), nullable=False) # 'ABOVE' or 'BELOW'
    email = Column(String(120), nullable=False)
    is_triggered = Column(Integer, default=0) # 0 for active, 1 for triggered
    created_at = Column(DateTime, default=datetime.utcnow)

class User(Base):
    __tablename__ = 'users'

    id = Column(String(128), primary_key=True) # Firebase UID
    username = Column(String(50), nullable=False, unique=True, index=True)
    email = Column(String(120), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class Watchlist(Base):
    __tablename__ = 'watchlists'

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(128), nullable=False, index=True)
    name = Column(String(50), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class WatchlistItem(Base):
    __tablename__ = 'watchlist_items'

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(128), nullable=False, index=True)
    watchlist_id = Column(Integer, index=True)
    ticker = Column(String(10), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class PortfolioItem(Base):
    __tablename__ = 'portfolio_items'

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(128), nullable=False, index=True)
    ticker = Column(String(10), nullable=False)
    shares = Column(Float, nullable=False)
    buy_price = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class AlertLog(Base):
    __tablename__ = 'alert_logs'

    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String(120), nullable=False, index=True)
    ticker = Column(String(10), nullable=False)
    sent_at = Column(DateTime, default=datetime.utcnow)
