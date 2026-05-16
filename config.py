import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    FLASK_ENV = os.getenv('FLASK_ENV', 'production')
    SECRET_KEY = os.getenv('SECRET_KEY', 'default-secret-key')
    REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
    DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///stocksight.db')
    CACHE_TTL_QUOTE = int(os.getenv('CACHE_TTL_QUOTE', 300))
    CACHE_TTL_HISTORY = int(os.getenv('CACHE_TTL_HISTORY', 3600))
    CORS_ORIGINS = os.getenv('CORS_ORIGINS', '*')

    
    # Mail Config
    MAIL_SERVER = os.getenv('MAIL_SERVER', 'smtp.gmail.com')
    MAIL_PORT = int(os.getenv('MAIL_PORT', 587))
    MAIL_USE_TLS = os.getenv('MAIL_USE_TLS', 'True') == 'True'
    MAIL_USE_SSL = os.getenv('MAIL_USE_SSL', 'False') == 'True'
    MAIL_USERNAME = os.getenv('MAIL_USERNAME', '')
    MAIL_PASSWORD = os.getenv('MAIL_PASSWORD', '')
    MAIL_DEFAULT_SENDER = os.getenv('MAIL_DEFAULT_SENDER', 'noreply@stocksight.com')
