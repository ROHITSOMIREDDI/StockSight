from flask import Flask, jsonify, render_template
from flask_cors import CORS
from config import Config
from models import Base
from sqlalchemy import create_engine
from flask_talisman import Talisman
from extensions import mail, limiter

def create_app():
    app = Flask(__name__, template_folder='templates', static_folder='static')
    app.config.from_object(Config)
    
    # Initialize Extensions
    mail.init_app(app)
    limiter.init_app(app)

    # HTTP Security Headers
    csp = {
        'default-src': ["'self'", "https://*.firebaseapp.com", "https://*.googleapis.com", "https://*.firebaseio.com"],
        'script-src': [
            "'self'", 
            "'unsafe-inline'", 
            "https://www.gstatic.com", 
            "https://cdn.jsdelivr.net",
            "https://apis.google.com",
            "https://*.firebaseapp.com"
        ],
        'style-src': ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        'font-src': ["'self'", "https://fonts.gstatic.com"],
        'img-src': ["'self'", "data:", "https://www.gstatic.com", "https://*.google.com", "https://*.googleusercontent.com"],
        'connect-src': [
            "'self'", 
            "https://*.firebaseio.com", 
            "https://*.googleapis.com", 
            "https://query2.finance.yahoo.com",
            "https://www.gstatic.com"
        ]
    }
    Talisman(app, content_security_policy=csp if app.config['FLASK_ENV'] == 'production' else None, force_https=False) # force_https=False for local dev
    
    # Whitelist CORS Origins
    origins = app.config['CORS_ORIGINS']
    if isinstance(origins, str) and ',' in origins:
        origins = origins.split(',')
    CORS(app, resources={r"/api/*": {"origins": origins}})
    
    engine = create_engine(app.config['DATABASE_URL'])

    Base.metadata.create_all(engine)
    
    from routes.stock import stock_bp
    from routes.predict import predict_bp
    from routes.backtest import backtest_bp
    from routes.auth import auth_bp
    
    app.register_blueprint(stock_bp, url_prefix='/api')
    app.register_blueprint(predict_bp, url_prefix='/api')
    app.register_blueprint(backtest_bp, url_prefix='/api')
    app.register_blueprint(auth_bp, url_prefix='/api')

    
    @app.route('/')
    def index():
        return render_template('index.html')
        
    @app.route('/watchlist')
    def watchlist_page():
        return render_template('watchlist.html')
        
    @app.route('/portfolio')
    def portfolio_page():
        return render_template('portfolio.html')
    @app.route('/about')
    def about_page():
        return render_template('about.html')

    @app.route('/login')
    def login_page():
        return render_template('login.html')

    @app.route('/signup')
    def signup_page():
        return render_template('signup.html')
        
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({"status": "error", "message": "Not found"}), 404

    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({"status": "error", "message": "Internal server error"}), 500
        
    @app.errorhandler(Exception)
    def unhandled_exception(e):
        app.logger.error(f'Unhandled Exception: {e}')
        return jsonify({"status": "error", "message": "An unexpected error occurred"}), 500

    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=(app.config['FLASK_ENV'] == 'development'), port=5000)
