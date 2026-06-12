# 📈 StockSight — AI-Powered Indian Market Intelligence Terminal

<p align="center">
  <img src="static/img/brand/logo_dark.jpg" alt="StockSight Logo" height="80"/>
</p>

<p align="center">
  <a href="https://www.python.org/"><img src="https://img.shields.io/badge/Python-3.10%2B-blue?logo=python&logoColor=white" alt="Python"/></a>
  <a href="https://flask.palletsprojects.com/"><img src="https://img.shields.io/badge/Flask-3.x-black?logo=flask" alt="Flask"/></a>
  <a href="https://firebase.google.com/"><img src="https://img.shields.io/badge/Firebase-Auth%20%26%20Firestore-orange?logo=firebase" alt="Firebase"/></a>
  <a href="https://scikit-learn.org/"><img src="https://img.shields.io/badge/scikit--learn-ML-F7931E?logo=scikit-learn&logoColor=white" alt="scikit-learn"/></a>
  <img src="https://img.shields.io/badge/Status-Production%20Ready-brightgreen" alt="Status"/>
  <img src="https://img.shields.io/badge/License-MIT-lightgrey" alt="License"/>
</p>

<p align="center">
  A professional-grade stock market intelligence platform for Indian retail investors — featuring real-time NSE/BSE data, AI price prediction, strategy backtesting, sentiment-aware news, and automated price alerts.
</p>

---

> **🚀 Live Demo:** [https://stocksight-gm2o.onrender.com/](https://stocksight-gm2o.onrender.com/)
>
> **📢 Community Feedback:** We are looking for suggestions! If you find a bug or have a feature idea, please open an [Issue](https://github.com/ROHITSOMIREDDI/StockSight/issues) or reach out to the developer.

---

---

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [System Architecture](#2-system-architecture)
3. [Technology Stack](#3-technology-stack)
4. [Project Structure](#4-project-structure)
5. [Backend — Core Modules](#5-backend--core-modules)
6. [Machine Learning Engine](#6-machine-learning-engine)
7. [REST API Reference](#7-rest-api-reference)
8. [Database Design](#8-database-design)
9. [Frontend Architecture](#9-frontend-architecture)
10. [Security Implementation](#10-security-implementation)
11. [Caching Strategy](#11-caching-strategy)
12. [Configuration Reference](#13-configuration-reference)

---

## 1. Project Overview

**StockSight** is a full-stack, AI-augmented stock market intelligence platform purpose-built for Indian retail investors. It provides professional-grade analytical tools — historically exclusive to institutional traders — through an accessible, high-density web interface.

### Core Value Proposition
- **Real-time Market Data** for NSE/BSE listed equities via Yahoo Finance
- **AI-Driven Price Prediction** using three interchangeable ML models
- **Strategy Backtesting** engine for hypothesis validation before risking capital
- **Automated Price Alerts** delivered via email upon threshold breach
- **Sentiment-Aware News Feed** with NLP-powered polarity scoring
- **Live Market Indices** — Sensex and Nifty 50 with sparkline trend visualization

### Target Users
- Indian retail investors seeking professional analytical tools
- Finance students learning technical analysis strategies
- Traders who need rapid multi-stock surveillance and alerting

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT BROWSER                        │
│  index.html · watchlist.html · portfolio.html           │
│  dashboard.js · watchlist.js · portfolio.js             │
│  Firebase Auth SDK (client-side token management)       │
└──────────────────────┬──────────────────────────────────┘
                       │  HTTPS / REST API
┌──────────────────────▼──────────────────────────────────┐
│               FLASK APPLICATION SERVER                   │
│                                                         │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │  routes/    │  │  services/   │  │     ml/       │  │
│  │  auth.py    │  │  stock.py    │  │  predictor.py │  │
│  │  stock.py   │  │  cache.py    │  │  features.py  │  │
│  │  predict.py │  │  backtest.py │  │               │  │
│  │  backtest.py│  └──────────────┘  └───────────────┘  │
│  └─────────────┘                                        │
│                                                         │
│  Flask-Talisman (CSP) · Flask-Limiter · Flask-CORS      │
│  Flask-Mail · Flask-SQLAlchemy                          │
└─────┬──────────────────────┬──────────────┬────────────┘
      │                      │              │
┌─────▼──────┐  ┌────────────▼────┐  ┌─────▼───────────┐
│  SQLite DB │  │   Redis Cache   │  │  Yahoo Finance  │
│  (SQLAlch) │  │  (TTL-based)    │  │  API (yfinance) │
└────────────┘  └─────────────────┘  └─────────────────┘
      │
┌─────▼──────────────────────┐
│  Firebase Auth & Firestore │
│  (Identity Provider)       │
└────────────────────────────┘
```

### Request Lifecycle
1. Browser sends HTTP request (page load or API call) to Flask server
2. For protected endpoints, `login_required` decorator extracts `Bearer` token from `Authorization` header
3. Token is verified server-side via `firebase_admin.auth.verify_id_token()`
4. Service layer checks Redis cache; on miss, fetches from yfinance and populates cache
5. For price-sensitive data, background thread checks `PriceAlert` table and dispatches emails if thresholds are breached
6. Response is serialized to JSON and returned to client

---

## 3. Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Runtime** | Python 3.10+ | Backend application runtime |
| **Web Framework** | Flask 3.x | Routing, blueprints, middleware |
| **Data Provider** | yfinance + Yahoo Finance API | Real-time & historical OHLCV data |
| **ML Libraries** | scikit-learn, XGBoost | Price prediction models |
| **Data Processing** | Pandas, NumPy | Feature engineering & time series ops |
| **NLP** | TextBlob | News sentiment polarity scoring |
| **ORM** | SQLAlchemy | Database abstraction layer |
| **Database** | SQLite (dev) / PostgreSQL-ready | Persistent state storage |
| **Cache** | Redis | TTL-based response caching |
| **Auth** | Firebase Authentication | User identity & JWT management |
| **Email** | Flask-Mail (SMTP/Gmail) | Automated price alert notifications |
| **Security** | Flask-Talisman, Flask-Limiter | CSP headers, rate limiting |
| **CORS** | Flask-CORS | Cross-origin request control |
| **Frontend** | Vanilla HTML5, CSS3, JavaScript | UI — no framework dependency |
| **Charts** | Chart.js + chartjs-chart-financial | Candlestick, line, RSI, MACD, sparkline charts |
| **Model Persistence** | joblib | Trained ML model serialization |
| **WSGI Server** | Gunicorn | Production application server |

---

## 4. Project Structure

```
stocksight/
├── app.py                    # Application factory, blueprint registration
├── config.py                 # Environment-based configuration class
├── extensions.py             # Flask extension instances (mail, limiter)
├── models.py                 # SQLAlchemy ORM models
├── requirements.txt          # Python dependencies
├── firestore.rules           # Firestore security rules
├── serviceAccountKey.json    # Firebase service account (local dev)
├── .env                      # Local environment variables (gitignored)
├── .env.example              # Template for env configuration
│
├── routes/                   # Flask Blueprint route handlers
│   ├── auth.py               # Firebase sync, watchlist & portfolio APIs
│   ├── stock.py              # Quote, history, search, alerts, news APIs
│   ├── predict.py            # ML prediction endpoint
│   └── backtest.py           # Strategy backtesting endpoint
│
├── services/                 # Business logic layer
│   ├── stock.py              # Data fetching, indicator computation, alert engine
│   ├── backtest.py           # SMA crossover & RSI breakout simulation engine
│   └── cache.py              # Redis get/set/delete wrapper
│
├── ml/                       # Machine learning pipeline
│   ├── features.py           # Technical indicator feature engineering
│   └── predictor.py          # Model training, serialization, inference
│
├── models_data/              # Persisted .joblib model files (per ticker)
│
├── templates/                # Jinja2 HTML templates
│   ├── index.html            # Main dashboard
│   ├── watchlist.html        # Market terminal / watchlist view
│   ├── portfolio.html        # Portfolio P&L tracker
│   ├── about.html            # About + developer profile
│   ├── login.html            # Sign in page
│   └── signup.html           # Registration page
│
├── static/
│   ├── css/
│   │   └── style.css         # Full design system (dark/light themes)
│   ├── js/
│   │   ├── dashboard.js      # Main dashboard logic (~967 lines)
│   │   ├── watchlist.js      # Market terminal logic (~469 lines)
│   │   ├── portfolio.js      # Portfolio tracker logic
│   │   └── firebase-config.js # Firebase SDK initialization
│   └── img/
│       ├── brand/            # logo_dark.jpg, logo_light.png
│       └── dev/              # Developer profile image
│
└── tests/                    # pytest test suite
```

---

## 5. Backend — Core Modules

### 5.1 Application Factory (`app.py`)
Implements the **Factory Pattern** for Flask, ensuring extensibility and testability. Key setup steps:

- Initializes extensions (Mail, Limiter) via `init_app()` pattern
- Configures **Content Security Policy** headers using Flask-Talisman; CSP is only enforced in `production` to avoid blocking dev tools
- Validates and configures **CORS origins** from environment variables
- Auto-creates all database tables via `Base.metadata.create_all(engine)` on startup
- Registers four Blueprints under the `/api` prefix
- Defines centralized error handlers for 404, 500, and unhandled exceptions

### 5.2 Stock Service (`services/stock.py`)
The primary data access layer. All functions follow a **Cache-Aside** pattern.

**`get_quote(ticker)`**
- Uses `yfinance.Ticker.fast_info` for low-latency price fetching (significantly faster than `.info`)
- Returns: `price`, `change`, `pct`, `open`, `dayHigh`, `dayLow`, `prevClose`, `mktcap`, `high52`, `low52`
- Spawns a **background thread** to check price alerts non-blocking after each quote fetch
- Cache TTL: `CACHE_TTL_QUOTE` (default: 300 seconds)

**`get_history(ticker, period)`**
- Fetches OHLCV data and computes four technical overlays in a single pass:
  - **Bollinger Bands** (20-day SMA ± 2 standard deviations)
  - **RSI-14** (Wilder's smoothing method)
  - **MACD** (EMA-12 minus EMA-26, with 9-day signal line)
- Returns a serialized list of daily candles, each enriched with all indicators
- Cache TTL: `CACHE_TTL_HISTORY` (default: 3600 seconds)

**`get_news(ticker)`**
- Fetches up to 8 articles from Yahoo Finance's news feed
- Runs **TextBlob NLP** sentiment analysis on each headline
- Classifies sentiment as `POSITIVE` (polarity > 0.05), `NEGATIVE` (< -0.05), or `NEUTRAL`

**`check_alerts(ticker, current_price)`**
- Queries `PriceAlert` table for untriggered alerts for the given ticker
- Evaluates `ABOVE` / `BELOW` conditions against current price
- **Rate-limits** email dispatch to 5 notifications per email per day via `AlertLog` table
- Marks alerts as `is_triggered = 1` after dispatch to prevent re-firing
- Sends formatted email via Flask-Mail (SMTP)

### 5.3 Cache Service (`services/cache.py`)
- Wraps Redis with a graceful **no-cache fallback** — if Redis is unavailable on startup, all cache operations are silently skipped (app continues working without caching)
- `get_cache(key)` → Deserializes JSON from Redis
- `set_cache(key, value, ttl)` → Serializes to JSON with expiry
- `clear_all_cache()` → Purges all `stock:*` pattern keys

### 5.4 Backtest Engine (`services/backtest.py`)
An event-driven trading simulator supporting two canonical strategies:

**SMA Crossover:**
- Computes 20-day and 50-day Simple Moving Averages
- **BUY signal**: SMA-20 crosses above SMA-50 (Golden Cross)
- **SELL signal**: SMA-20 crosses below SMA-50 (Death Cross)

**RSI Breakout:**
- Computes RSI-14
- **BUY signal**: RSI drops below 30 (oversold)
- **SELL signal**: RSI rises above 70 (overbought)

**Simulation Logic:**
- Starts with ₹1,00,000 virtual capital
- Simulates whole-portfolio trades (no fractional position sizing)
- Calculates daily equity curve for visualization
- Closes any open position at final candle on simulation end
- Returns: final capital, total return %, win rate %, trade log, equity curve

---

## 6. Machine Learning Engine

### 6.1 Feature Engineering (`ml/features.py`)

The `engineer_features(df)` function transforms raw OHLCV data into an 8-feature matrix:

| Feature | Description | Lookback |
|---|---|---|
| `SMA_20` | 20-day Simple Moving Average | 20 days |
| `SMA_50` | 50-day Simple Moving Average | 50 days |
| `EMA_12` | 12-day Exponential Moving Average | 12 days |
| `RSI_14` | Relative Strength Index (Wilder smoothing) | 14 days |
| `Daily_Return` | Percentage daily price change | 1 day |
| `Volatility_5` | 5-day rolling std dev of daily returns | 5 days |
| `Lag_1_Close` | Previous day's closing price | 1 day |
| `Lag_5_Close` | Closing price 5 days ago | 5 days |

**Target variable:** `Target_Close` — the next day's closing price (shift by -1)

### 6.2 Model Training & Inference (`ml/predictor.py`)

**Training Pipeline:**
1. Runs `engineer_features()` and drops rows with NaN values
2. Performs an 80/20 chronological train/test split (no shuffle — preserves time order)
3. Applies `StandardScaler` fit on training data only; transforms test set to prevent data leakage
4. Trains the selected model and computes test-set metrics: MAE, RMSE, R²
5. Computes residual standard deviation to generate **confidence interval bounds**
6. Persists model (`model.joblib`), scaler (`scaler.joblib`), and metrics (`metrics.json`) under `models_data/`

**Supported Models:**

| Model | Library | Hyperparameters |
|---|---|---|
| Linear Regression | scikit-learn | Default |
| Random Forest | scikit-learn | `n_estimators=100, random_state=42` |
| XGBoost | xgboost | `n_estimators=100, lr=0.08, max_depth=4` |

**Inference:**
- Loads persisted model and scaler
- On first request for a ticker, auto-triggers training using 2 years of historical data
- Returns `predicted`, `lower` (prediction − std_dev), `upper` (prediction + std_dev), MAE, RMSE, R²

---

## 7. REST API Reference

### Authentication
All protected endpoints require:
```
Authorization: Bearer <Firebase_ID_Token>
```

### Public Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/stock/<ticker>` | Real-time quote with daily metrics |
| `GET` | `/api/history/<ticker>?period=1y` | OHLCV + indicators (1w/1m/3m/1y/5y) |
| `GET` | `/api/search?q=<query>` | Indian stock ticker search |
| `GET` | `/api/news/<ticker>` | Sentiment-scored news feed |
| `POST` | `/api/alerts` | Register a price alert |
| `GET` | `/api/alerts/<email>` | Retrieve alerts by email |

### Protected Endpoints (Login Required)

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/firebase-sync` | Sync Firebase user to local DB |
| `POST` | `/api/auth/logout` | Revoke session & Firebase tokens |
| `GET` | `/api/auth/status` | Check session status |
| `GET` | `/api/watchlists` | Get all user watchlists |
| `POST` | `/api/watchlists` | Create a named watchlist |
| `DELETE` | `/api/watchlists/<id>` | Delete a watchlist + its items |
| `GET` | `/api/watchlist/items` | Get tickers in a watchlist |
| `POST` | `/api/watchlist/items` | Add ticker to watchlist |
| `DELETE` | `/api/watchlist/items` | Remove ticker from watchlist |
| `GET` | `/api/portfolio` | Get all portfolio holdings |
| `POST` | `/api/portfolio` | Add/update a holding (weighted avg cost) |
| `DELETE` | `/api/portfolio/<ticker>` | Remove a holding |
| `GET` | `/api/predict/<ticker>?model=` | Run next-day price prediction |
| `GET` | `/api/model/metrics/<ticker>` | Get model accuracy metrics |
| `POST` | `/api/backtest` | Run strategy backtest simulation |

### Sample Response — `/api/stock/RELIANCE.NS`
```json
{
  "price": 2975.50,
  "change": 34.25,
  "pct": 1.16,
  "open": 2945.00,
  "dayHigh": 2988.00,
  "dayLow": 2938.75,
  "prevClose": 2941.25,
  "mktcap": 20134567890,
  "high52": 3217.90,
  "low52": 2220.10
}
```

---

## 8. Database Design

SQLite in development; any SQLAlchemy-compatible database in production (PostgreSQL recommended).

### Entity-Relationship Overview

```
User (Firebase UID as PK)
  ├── Watchlist (user_id FK)
  │     └── WatchlistItem (watchlist_id FK, ticker)
  ├── WatchlistItem (user_id FK, ticker) — default list
  └── PortfolioItem (user_id FK, ticker, shares, buy_price)

PriceAlert (ticker, target_price, condition, email, is_triggered)
AlertLog (email, ticker, sent_at) — rate-limit guard
```

### Table Schemas

**`users`** — `id` (Firebase UID), `username`, `email`, `created_at`

**`watchlists`** — `id`, `user_id`, `name`, `created_at`

**`watchlist_items`** — `id`, `user_id`, `watchlist_id` (nullable = default list), `ticker`, `created_at`

**`portfolio_items`** — `id`, `user_id`, `ticker`, `shares`, `buy_price` (weighted avg cost), `created_at`

**`price_alerts`** — `id`, `ticker`, `target_price`, `condition` (ABOVE/BELOW), `email`, `is_triggered`, `created_at`

**`alert_logs`** — `id`, `email`, `ticker`, `sent_at`

> **Design Note:** `buy_price` in `portfolio_items` stores the weighted average cost basis. When adding to an existing position: `new_avg = (old_shares × old_price + new_shares × new_price) / total_shares`

---

## 9. Frontend Architecture

The frontend is built with **zero JavaScript frameworks** — pure Vanilla JS, HTML5, and CSS3. This ensures minimal bundle size, no build toolchain, and maximum browser compatibility.

### 9.1 Design System (`static/css/style.css`)
- Implements a **dual-theme system** (dark/light) using CSS custom properties (`--bg-color`, `--text-primary`, `--accent-color`, etc.)
- Theme state is persisted in `localStorage` under key `stocksight_theme`
- Uses **glassmorphism** card styling (`backdrop-filter: blur`, semi-transparent backgrounds)
- Typography: **Inter** (Google Fonts) across all weights (300–700)
- Fully responsive with CSS Grid and Flexbox layouts

### 9.2 Dashboard (`static/js/dashboard.js` — ~967 lines)

Responsibilities:
- **Authentication Guard**: Uses `firebase.auth().onAuthStateChanged()` to conditionally render the guest landing or authenticated dashboard
- **Ticker Search**: Debounced autocomplete with 300ms delay querying `/api/search`
- **Chart Rendering**: Four Chart.js instances managed independently:
  - `mainChart` — Candlestick or Line (OHLCV + Bollinger Bands overlay)
  - `volumeChart` — Bar chart for daily volume
  - `rsiChart` — Line chart with 30/70 threshold bands
  - `macdChart` — Combo chart (MACD line, Signal line, Histogram bars)
- **Market Indices**: Fetches Sensex (`^BSESN`) and Nifty 50 (`^NSEI`) every 60 seconds, renders sparkline charts via Chart.js with Open and Prev Close benchmarks
- **AI Prediction**: Calls `/api/predict/<ticker>` with selected model, displays predicted price with confidence interval
- **Backtesting**: Calls `/api/backtest`, renders equity curve and trade log
- **Price Alerts**: Submits to `/api/alerts` with ticker, target price, condition, and email
- **News Feed**: Fetches and renders sentiment-tagged articles with color-coded badges
- **Theme Toggle**: `applyTheme()` function switches CSS classes and swaps the logo image src
- **Nav Clock**: IST live clock refreshing every second via `setInterval`
- **CSV Export**: Converts loaded history data to CSV Blob and triggers download

### 9.3 Market Terminal (`static/js/watchlist.js` — ~469 lines)

A Bloomberg-inspired multi-panel layout:
- **Left panel**: MarketWatch sidebar with tab-based multi-watchlist navigation
- **Right panel**: Full stock analysis view with chart, statistics grid, prediction panel, news feed
- Features real-time price updates, add/remove from watchlist, and portfolio sync
- The statistics panel renders: Open, Day High, Day Low, Prev Close, Market Cap, 52W High, 52W Low

### 9.4 Portfolio Tracker (`static/js/portfolio.js`)
- Loads holdings from `/api/portfolio` and fetches current quotes for each
- Calculates real-time P&L: `(current_price − avg_buy_price) × shares`
- Displays: Total Invested, Current Value, Total P&L, and P&L % with color coding
- Supports adding new holdings with weighted average cost basis calculation on overlap

### 9.5 Firebase Integration (`static/js/firebase-config.js`)
- Initializes Firebase SDK with project credentials
- The `auth` object is exported for use across all pages (`dashboard.js`, `watchlist.js`, `portfolio.js`)
- All authenticated API calls attach the Firebase ID token: `auth.currentUser.getIdToken()` → `Authorization: Bearer <token>`

---

## 10. Security Implementation

### Authentication Flow
```
1. User signs in via Firebase Auth (email/password)
2. Firebase returns a JWT ID Token to the browser
3. Browser sends POST /api/auth/firebase-sync with idToken
4. Server verifies token with firebase_admin.auth.verify_id_token()
5. On success, user is upserted in local DB and Flask session is established
6. All subsequent API calls attach token in Authorization header
7. login_required decorator verifies token on every protected request
```

### Security Headers (Flask-Talisman)
In production, the following CSP directives are enforced:
- `default-src 'self'` — blocks all external resources by default
- `script-src` — whitelists CDN (jsdelivr, gstatic) and inline scripts
- `connect-src` — restricts API calls to Firebase domains and Yahoo Finance

### Rate Limiting (Flask-Limiter)
- Global default: **60 requests per minute** per IP
- Prediction endpoint: **10 requests per minute** (ML inference is compute-intensive)

### Input Sanitization
- All ticker symbols are sanitized with regex: `re.sub(r'[^A-Z0-9.\-^]', '', ticker.upper())`
- SQL injection is prevented by SQLAlchemy's parameterized ORM queries
- Alert email dispatch is rate-limited to 5 per user per day

### Firestore Security Rules
- Users can only read/write their own document namespace (`userId == request.auth.uid`)
- All rules require `request.auth != null`

---

## 11. Caching Strategy

| Data Type | Cache Key Pattern | TTL |
|---|---|---|
| Stock Quote | `stock:quote:<ticker>` | 300s (5 min) |
| Price History | `stock:history:<ticker>:<period>` | 3600s (1 hr) |
| ML Prediction | `stock:predict:<ticker>:<model>` | 3600s (1 hr) |
| News Feed | `stock:news:<ticker>` | 300s (5 min) |
| Search Results | `stock:search:<query>` | 86400s (24 hr) |

**Fallback Behavior:** If Redis is unreachable at startup, `redis_client` is set to `None` and all cache operations are no-ops — the application fetches live data on every request with no crashes.

---


## 12. Configuration Reference

| Variable | Default | Description |
|---|---|---|
| `FLASK_ENV` | `production` | `development` disables CSP headers |
| `SECRET_KEY` | (required) | Flask session encryption key |
| `DATABASE_URL` | `sqlite:///stocksight.db` | SQLAlchemy connection string |
| `REDIS_URL` | `redis://localhost:6379/0` | Redis connection URL |
| `CACHE_TTL_QUOTE` | `300` | Quote cache TTL in seconds |
| `CACHE_TTL_HISTORY` | `3600` | History/prediction cache TTL |
| `CORS_ORIGINS` | `*` | Allowed CORS origins (comma-separated) |
| `MAIL_SERVER` | `smtp.gmail.com` | SMTP host |
| `MAIL_PORT` | `587` | SMTP port (587 for TLS) |
| `MAIL_USERNAME` | (required for alerts) | Gmail sender address |
| `MAIL_PASSWORD` | (required for alerts) | Gmail App Password |
| `FIREBASE_SERVICE_ACCOUNT` | (optional) | JSON string of Firebase credentials |

---

## Key Design Decisions

> [!NOTE]
> **Why yfinance `fast_info` over `.info`?** The standard `.info` property makes multiple API calls to Yahoo Finance and is significantly slower (~2–4s). `fast_info` returns a pre-computed snapshot in <200ms, which is critical for a real-time dashboard that polls multiple tickers simultaneously.

> [!TIP]
> **Why SQLite + SQLAlchemy?** Using SQLAlchemy's ORM means migrating from SQLite (development) to PostgreSQL (production) requires only changing the `DATABASE_URL` environment variable. Zero code changes needed.

> [!IMPORTANT]
> **Why background threads for alerts?** Alert checking involves database queries and potentially SMTP calls. Running this synchronously inside the quote request would add 200–2000ms latency to every price fetch. A daemon thread ensures the alert check is completely non-blocking.

> [!WARNING]
> **Before deploying to production:** Ensure `FLASK_ENV=production` is set, `SECRET_KEY` is a cryptographically random string (use `python -c "import secrets; print(secrets.token_hex(32))"`), and `CORS_ORIGINS` is set to your production domain only.

---

---

## 14. About the Developer

<table>
  <tr>
    <td align="center">
      <strong>Rohit Somireddi</strong><br/>
      Full-Stack Developer · AI/ML Enthusiast<br/><br/>
      <a href="https://github.com/ROHITSOMIREDDI">🐙 GitHub</a> &nbsp;|&nbsp;
      <a href="https://www.linkedin.com/in/rohit-somireddi">💼 LinkedIn</a> &nbsp;|&nbsp;
      <a href="https://www.instagram.com/r_roh.it1.28">📸 Instagram</a> &nbsp;|&nbsp;
      <a href="mailto:rohitpc161221@gmail.com">✉️ Email</a>
    </td>
  </tr>
</table>

StockSight was designed, architected, and built entirely by **Rohit Somireddi** as a full-stack capstone project demonstrating the integration of real-time financial data, machine learning, and modern web development practices.

---

## 15. Contributing

Contributions, issues, and feature requests are welcome!

1. **Fork** the repository
2. Create your feature branch: `git checkout -b feature/your-feature-name`
3. Commit your changes: `git commit -m 'feat: add some feature'`
4. Push to the branch: `git push origin feature/your-feature-name`
5. Open a **Pull Request**

Please follow [Conventional Commits](https://www.conventionalcommits.org/) for commit messages.

---

## 16. License

This project is licensed under the **MIT License**.

```
MIT License — Copyright (c) 2026 Rohit Somireddi

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
```

---

## 17. Acknowledgements

- **[Yahoo Finance / yfinance](https://github.com/ranaroussi/yfinance)** — Real-time and historical market data
- **[Firebase](https://firebase.google.com/)** — Authentication and cloud database
- **[Chart.js](https://www.chartjs.org/)** — Interactive financial charts
- **[scikit-learn](https://scikit-learn.org/)** & **[XGBoost](https://xgboost.readthedocs.io/)** — ML prediction models
- **[TextBlob](https://textblob.readthedocs.io/)** — News sentiment analysis
- **[Flask](https://flask.palletsprojects.com/)** — Python web framework
- **[Inter Font](https://fonts.google.com/specimen/Inter)** — UI typography

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/ROHITSOMIREDDI">Rohit Somireddi</a> · © 2026 StockSight
  <br/>
  <em>Not financial advice. For educational purposes only.</em>
</p>
