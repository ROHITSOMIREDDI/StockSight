import os
import json
import firebase_admin
from firebase_admin import credentials, auth
from flask import Blueprint, jsonify, request, session
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import User, WatchlistItem, PortfolioItem, Watchlist
from config import Config

auth_bp = Blueprint('auth', __name__)

# Initialize Firebase Admin
# Preference: Load from ENV variable in production, fallback to file in dev
firebase_creds_json = os.getenv("FIREBASE_SERVICE_ACCOUNT")
if firebase_creds_json:
    try:
        cred_dict = json.loads(firebase_creds_json)
        cred = credentials.Certificate(cred_dict)
        firebase_admin.initialize_app(cred)
    except Exception as e:
        print(f"ERROR: Failed to initialize Firebase from ENV: {e}")
else:
    service_account_path = os.path.join(os.getcwd(), 'serviceAccountKey.json')
    if os.path.exists(service_account_path):
        cred = credentials.Certificate(service_account_path)
        firebase_admin.initialize_app(cred)
    else:
        print("WARNING: serviceAccountKey.json not found and FIREBASE_SERVICE_ACCOUNT env not set.")

def get_db_session():
    engine = create_engine(Config.DATABASE_URL)
    Session = sessionmaker(bind=engine)
    return Session()

def verify_firebase_token(id_token):
    try:
        decoded_token = auth.verify_id_token(id_token)
        return decoded_token
    except Exception as e:
        print(f"Token verification failed: {e}")
        return None

from functools import wraps
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        id_token = None
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            id_token = auth_header.split('Bearer ')[1]
        
        if not id_token:
            # Check session for page loads, but for API we want token
            if 'user_id' in session:
                 return f(*args, **kwargs)
            return jsonify({"status": "error", "message": "Authentication token required"}), 401
            
        decoded = verify_firebase_token(id_token)
        if not decoded:
            return jsonify({"status": "error", "message": "Invalid or expired token"}), 401
            
        request.user_uid = decoded['uid']
        return f(*args, **kwargs)
    return decorated_function

@auth_bp.route('/auth/firebase-sync', methods=['POST'])
def firebase_sync():
    """Sync Firebase user with local database"""
    data = request.get_json() or {}
    id_token = data.get('idToken')
    
    if not id_token:
        return jsonify({"status": "error", "message": "ID Token required"}), 400
        
    decoded = verify_firebase_token(id_token)
    if not decoded:
        return jsonify({"status": "error", "message": "Invalid token"}), 401
        
    uid = decoded['uid']
    email = decoded.get('email')
    name = decoded.get('name') or email.split('@')[0]
    
    db = get_db_session()
    try:
        user = db.query(User).filter(User.id == uid).first()
        if not user:
            user = User(id=uid, username=name, email=email)
            db.add(user)
            db.commit()
            
        session['user_id'] = uid
        session['username'] = name
        
        return jsonify({
            "status": "success",
            "message": "Authenticated successfully"
        })
    except Exception as e:
        db.rollback()
        return jsonify({"status": "error", "message": "Authentication synchronization failed"}), 500
    finally:
        db.close()

@auth_bp.route('/auth/logout', methods=['POST', 'GET'])
def logout():
    uid = session.get('user_id')
    if uid:
        try:
            auth.revoke_refresh_tokens(uid)
        except Exception:
            pass
    session.clear()
    return jsonify({"status": "success", "message": "Logged out successfully"})

@auth_bp.route('/auth/status', methods=['GET'])
def auth_status():
    if 'user_id' in session:
        return jsonify({
            "logged_in": True,
            "user": {"username": session.get('username')}
        })
    return jsonify({"logged_in": False})

# Watchlist Management APIs
@auth_bp.route('/watchlists', methods=['GET'])
@login_required
def get_watchlists():
    user_id = session.get('user_id')
    db = get_db_session()
    try:
        lists = db.query(Watchlist).filter(Watchlist.user_id == user_id).all()
        result = [{"id": l.id, "name": l.name} for l in lists]
        return jsonify(result)
    except Exception:
        return jsonify({"status": "error", "message": "Failed to fetch watchlists"}), 500
    finally:
        db.close()

@auth_bp.route('/watchlists', methods=['POST'])
@login_required
def create_watchlist():
    user_id = session.get('user_id')

    data = request.get_json() or {}
    name = data.get('name', '').strip()
    if not name:
        return jsonify({"status": "error", "message": "Missing name"}), 400

    db = get_db_session()
    try:
        wl = Watchlist(user_id=user_id, name=name)
        db.add(wl)
        db.commit()
        return jsonify({"status": "success", "message": f"Created watchlist {name}", "id": wl.id})
    except Exception:
        db.rollback()
        return jsonify({"status": "error", "message": "Failed to create watchlist"}), 500
    finally:
        db.close()

@auth_bp.route('/watchlists/<int:id>', methods=['DELETE'])
@login_required
def delete_watchlist(id):
    user_id = session.get('user_id')

    db = get_db_session()
    try:
        wl = db.query(Watchlist).filter(Watchlist.id == id, Watchlist.user_id == user_id).first()
        if wl:
            db.query(WatchlistItem).filter(WatchlistItem.watchlist_id == id).delete()
            db.delete(wl)
            db.commit()
        return jsonify({"status": "success", "message": "Watchlist deleted"})
    except Exception:
        db.rollback()
        return jsonify({"status": "error", "message": "Failed to delete watchlist"}), 500
    finally:
        db.close()

# Watchlist Item Persistence APIs
@auth_bp.route('/watchlist/items', methods=['GET'])
@login_required
def get_watchlist_items():
    user_id = session.get('user_id')

    watchlist_id = request.args.get('watchlist_id', type=int)
    db = get_db_session()
    try:
        query = db.query(WatchlistItem).filter(WatchlistItem.user_id == user_id)
        if watchlist_id:
            query = query.filter(WatchlistItem.watchlist_id == watchlist_id)
        else:
            query = query.filter(WatchlistItem.watchlist_id == None)
            
        items = query.all()
        tickers = [item.ticker for item in items]
        return jsonify(tickers)
    except Exception:
        return jsonify({"status": "error", "message": "Failed to fetch items"}), 500
    finally:
        db.close()

@auth_bp.route('/watchlist/items', methods=['POST'])
@login_required
def add_to_watchlist():
    user_id = session.get('user_id')

    data = request.get_json() or {}
    ticker = data.get('ticker', '').strip().upper()
    watchlist_id = data.get('watchlist_id')
    
    if not ticker:
        return jsonify({"status": "error", "message": "Missing ticker"}), 400

    db = get_db_session()
    try:
        existing = db.query(WatchlistItem).filter(
            WatchlistItem.user_id == user_id,
            WatchlistItem.ticker == ticker,
            WatchlistItem.watchlist_id == watchlist_id
        ).first()
        
        if not existing:
            item = WatchlistItem(user_id=user_id, ticker=ticker, watchlist_id=watchlist_id)
            db.add(item)
            db.commit()
            
        return jsonify({"status": "success", "message": f"Added {ticker} to watchlist"})
    except Exception:
        db.rollback()
        return jsonify({"status": "error", "message": "Failed to add to watchlist"}), 500
    finally:
        db.close()

@auth_bp.route('/watchlist/items', methods=['DELETE'])
@login_required
def remove_from_watchlist():
    user_id = session.get('user_id')

    watchlist_id = request.args.get('watchlist_id', type=int)
    ticker = request.args.get('ticker', '').strip().upper()
    db = get_db_session()
    try:
        query = db.query(WatchlistItem).filter(
            WatchlistItem.user_id == user_id,
            WatchlistItem.ticker == ticker
        )
        if watchlist_id:
            query = query.filter(WatchlistItem.watchlist_id == watchlist_id)
        else:
            query = query.filter(WatchlistItem.watchlist_id == None)
            
        item = query.first()
        if item:
            db.delete(item)
            db.commit()
            
        return jsonify({"status": "success", "message": f"Removed {ticker} from watchlist"})
    except Exception:
        db.rollback()
        return jsonify({"status": "error", "message": "Failed to remove from watchlist"}), 500
    finally:
        db.close()

# Portfolio Persistence APIs
@auth_bp.route('/portfolio', methods=['GET'])
@login_required
def get_portfolio():
    user_id = session.get('user_id')

    db = get_db_session()
    try:
        items = db.query(PortfolioItem).filter(PortfolioItem.user_id == user_id).all()
        result = []
        for item in items:
            result.append({
                "ticker": item.ticker,
                "shares": item.shares,
                "buyPrice": item.buy_price
            })
        return jsonify(result)
    except Exception:
        return jsonify({"status": "error", "message": "Failed to fetch portfolio"}), 500
    finally:
        db.close()

@auth_bp.route('/portfolio', methods=['POST'])
@login_required
def update_portfolio():
    user_id = session.get('user_id')

    data = request.get_json() or {}
    ticker = data.get('ticker', '').strip().upper()
    shares = data.get('shares')
    buy_price = data.get('buyPrice') or data.get('buy_price')

    if not ticker or shares is None or buy_price is None:
        return jsonify({"status": "error", "message": "Missing ticker, shares, or buyPrice"}), 400

    from routes.stock import sanitize_ticker
    ticker = sanitize_ticker(ticker)
    
    try:
        shares = float(shares)
        buy_price = float(buy_price)
        if shares <= 0 or buy_price <= 0:
             return jsonify({"status": "error", "message": "Shares and price must be greater than zero"}), 400
    except (ValueError, TypeError):
        return jsonify({"status": "error", "message": "Invalid numeric values"}), 400

    db = get_db_session()
    try:
        existing = db.query(PortfolioItem).filter(
            PortfolioItem.user_id == user_id,
            PortfolioItem.ticker == ticker
        ).first()

        if existing:
            new_shares = existing.shares + shares
            new_cost = (existing.shares * existing.buy_price) + (shares * buy_price)
            existing.shares = new_shares
            existing.buy_price = new_cost / new_shares
        else:
            item = PortfolioItem(
                user_id=user_id,
                ticker=ticker,
                shares=shares,
                buy_price=buy_price
            )
            db.add(item)
            
        db.commit()
        return jsonify({"status": "success", "message": f"Updated holdings for {ticker}"})
    except Exception as e:
        db.rollback()
        return jsonify({"status": "error", "message": "Failed to update portfolio"}), 500
    finally:
        db.close()

@auth_bp.route('/portfolio/<ticker>', methods=['DELETE'])
@login_required
def remove_portfolio(ticker):
    user_id = session.get('user_id')

    ticker = ticker.strip().upper()
    db = get_db_session()
    try:
        item = db.query(PortfolioItem).filter(
            PortfolioItem.user_id == user_id,
            PortfolioItem.ticker == ticker
        ).first()
        
        if item:
            db.delete(item)
            db.commit()
            
        return jsonify({"status": "success", "message": f"Removed holdings for {ticker}"})
    except Exception:
        db.rollback()
        return jsonify({"status": "error", "message": "Failed to remove portfolio item"}), 500
    finally:
        db.close()
