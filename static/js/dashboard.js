const urlParams = new URLSearchParams(window.location.search);
let currentTicker = urlParams.get('ticker') || 'RELIANCE.NS';
let currentTimeframe = '1y';
let currentChartType = 'candlestick';
let mainChart = null;
let volumeChart = null;
let rsiChart = null;
let sensexSparklineChart = null;
let niftySparklineChart = null;

let isLoggedIn = false;
let currentUser = null;

const tickerSearch = document.getElementById('tickerSearch');
const searchResults = document.getElementById('searchResults');
const stockTicker = document.getElementById('stockTicker');
const currentPrice = document.getElementById('currentPrice');
const priceChange = document.getElementById('priceChange');
const changeValue = document.getElementById('changeValue');
const changePct = document.getElementById('changePct');
const marketCap = document.getElementById('marketCap');
const high52 = document.getElementById('high52');
const low52 = document.getElementById('low52');
const predictedPrice = document.getElementById('predictedPrice');
const predInterval = document.getElementById('predInterval');
const predMae = document.getElementById('predMae');
const predR2 = document.getElementById('predR2');

const themeToggleBtn = document.getElementById('themeToggleBtn');
const actionMenuBtn = document.getElementById('actionMenuBtn');
const actionDropdown = document.getElementById('actionDropdown');
const addWatchlistBtn = document.getElementById('addWatchlistBtn');
const addPortfolioBtn = document.getElementById('addPortfolioBtn');

const addPortfolioModal = document.getElementById('addPortfolioModal');
const portTickerInput = document.getElementById('portTickerInput');
const portSharesInput = document.getElementById('portSharesInput');
const portBuyPriceInput = document.getElementById('portBuyPriceInput');
const savePortfolioBtn = document.getElementById('savePortfolioBtn');
const closePortfolioBtn = document.getElementById('closePortfolioBtn');

const gaugeLow = document.getElementById('gaugeLow');
const gaugeHigh = document.getElementById('gaugeHigh');
const gaugeFill = document.getElementById('gaugeFill');
const newsGrid = document.getElementById('newsGrid');

let watchlist = JSON.parse(localStorage.getItem('stocksight_watchlist')) || ['RELIANCE.NS', 'TCS.NS'];
let portfolio = JSON.parse(localStorage.getItem('stocksight_portfolio')) || [
    { ticker: 'RELIANCE.NS', shares: 10, buyPrice: 1350.0 },
    { ticker: 'TCS.NS', shares: 5, buyPrice: 2400.0 }
];
let isDarkMode = localStorage.getItem('stocksight_theme') !== 'light';

const tfBtns = document.querySelectorAll('.tf-btn');
const ctBtns = document.querySelectorAll('.ct-btn[data-type]');
const setAlertBtn = document.getElementById('setAlertBtn');
const alertModal = document.getElementById('alertModal');
const saveAlertBtn = document.getElementById('saveAlertBtn');
const closeAlertBtn = document.getElementById('closeAlertBtn');
const alertTargetPrice = document.getElementById('alertTargetPrice');
const alertCondition = document.getElementById('alertCondition');
const alertEmail = document.getElementById('alertEmail');
const exportCsvBtn = document.getElementById('exportCsvBtn');

let loadedHistoryData = [];

const currencyFmt = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });
const numFmt = new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 });

document.addEventListener('DOMContentLoaded', async () => {
    applyTheme();
    await checkAuthStatus();
    loadTickerData(currentTicker);
    setupEventListeners();
});

function applyTheme() {
    const siteLogo = document.getElementById('siteLogo');
    if (isDarkMode) {
        document.body.classList.remove('light-theme');
        document.body.classList.add('dark-theme');
        themeToggleBtn.textContent = '☀️';
        if (siteLogo) siteLogo.src = '/static/img/brand/logo_dark.jpg';
    } else {
        document.body.classList.remove('dark-theme');
        document.body.classList.add('light-theme');
        themeToggleBtn.textContent = '🌙';
        if (siteLogo) siteLogo.src = '/static/img/brand/logo_light.png';
    }
}


function setupEventListeners() {
    let searchTimeout;
    tickerSearch.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        const query = e.target.value.trim();
        if (query.length < 1) {
            searchResults.classList.add('hidden');
            return;
        }
        searchTimeout = setTimeout(() => fetchSearchResults(query), 300);
    });

    const landingTickerSearch = document.getElementById('landingTickerSearch');
    const landingSearchResults = document.getElementById('landingSearchResults');
    if (landingTickerSearch) {
        landingTickerSearch.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            const query = e.target.value.trim();
            if (query.length < 1) {
                landingSearchResults.classList.add('hidden');
                return;
            }
            searchTimeout = setTimeout(() => fetchSearchResults(query, true), 300);
        });
    }

    document.addEventListener('click', (e) => {
        if (!tickerSearch.contains(e.target) && !searchResults.contains(e.target)) {
            searchResults.classList.add('hidden');
        }
        if (landingTickerSearch && !landingTickerSearch.contains(e.target) && !landingSearchResults.contains(e.target)) {
            landingSearchResults.classList.add('hidden');
        }
        if (!actionMenuBtn.contains(e.target) && !actionDropdown.contains(e.target)) {
            actionDropdown.classList.add('hidden');
        }
    });

    themeToggleBtn.addEventListener('click', () => {
        isDarkMode = !isDarkMode;
        localStorage.setItem('stocksight_theme', isDarkMode ? 'dark' : 'light');
        applyTheme();
    });

    actionMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        actionDropdown.classList.toggle('hidden');
    });

    addWatchlistBtn.addEventListener('click', async () => {
        actionDropdown.classList.add('hidden');
        if (watchlist.includes(currentTicker)) {
            alert(`${currentTicker} is already in your Watchlist!`);
        } else {
            watchlist.push(currentTicker);
            if (isLoggedIn) {
                await authenticatedFetch('/api/watchlist/items', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ticker: currentTicker })
                });
            } else {
                localStorage.setItem('stocksight_watchlist', JSON.stringify(watchlist));
            }
            alert(`Successfully added ${currentTicker} to your Watchlist!`);
        }
    });

    addPortfolioBtn.addEventListener('click', () => {
        actionDropdown.classList.add('hidden');
        portTickerInput.value = currentTicker;
        const currP = parseFloat(currentPrice.textContent.replace(/[^0-9.]/g, ''));
        portBuyPriceInput.value = isNaN(currP) ? '' : currP;
        portSharesInput.value = '';
        addPortfolioModal.classList.remove('hidden');
    });

    closePortfolioBtn.addEventListener('click', () => {
        addPortfolioModal.classList.add('hidden');
    });

    savePortfolioBtn.addEventListener('click', async () => {
        const shares = parseFloat(portSharesInput.value);
        const buyPrice = parseFloat(portBuyPriceInput.value);
        if (isNaN(shares) || isNaN(buyPrice)) {
            alert('Please enter valid shares and buy price.');
            return;
        }

        if (isLoggedIn) {
            try {
                await authenticatedFetch('/api/portfolio', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ticker: currentTicker, shares, buyPrice })
                });
            } catch (err) {
                console.error('Portfolio save DB failed:', err);
            }
        } else {
            const existingIndex = portfolio.findIndex(item => item.ticker === currentTicker);
            if (existingIndex > -1) {
                const existing = portfolio[existingIndex];
                const newTotalCost = (existing.shares * existing.buyPrice) + (shares * buyPrice);
                const newShares = existing.shares + shares;
                existing.shares = newShares;
                existing.buyPrice = newTotalCost / newShares;
            } else {
                portfolio.push({ ticker: currentTicker, shares, buyPrice });
            }
            localStorage.setItem('stocksight_portfolio', JSON.stringify(portfolio));
        }

        addPortfolioModal.classList.add('hidden');
        alert(`Successfully added ${currentTicker} to your Portfolio!`);
    });

    tfBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            tfBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentTimeframe = e.target.dataset.period;
            loadHistory(currentTicker, currentTimeframe);
        });
    });

    ctBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            ctBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentChartType = e.target.dataset.type;
            loadHistory(currentTicker, currentTimeframe);
        });
    });

    // Set Alert Event Listeners
    setAlertBtn.addEventListener('click', () => {
        alertTargetPrice.value = document.getElementById('currentPrice').textContent.replace(/[^0-9.]/g, '');
        alertModal.classList.remove('hidden');
    });
    closeAlertBtn.addEventListener('click', () => alertModal.classList.add('hidden'));

    saveAlertBtn.addEventListener('click', async () => {
        const price = parseFloat(alertTargetPrice.value);
        const cond = alertCondition.value;
        const email = alertEmail.value.trim();

        if (isNaN(price) || !email) {
            alert('Please enter a valid target price and email address.');
            return;
        }

        try {
            const res = await authenticatedFetch('/api/alerts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ticker: currentTicker,
                    target_price: price,
                    condition: cond,
                    email: email
                })
            });
            const data = await res.json();
            if (res.ok) {
                alert(data.message);
                alertModal.classList.add('hidden');
            } else {
                alert('Error: ' + data.message);
            }
        } catch (err) {
            console.error('Save alert error:', err);
            alert('Failed to register price alert.');
        }
    });

    // Export CSV Event Listener
    exportCsvBtn.addEventListener('click', () => {
        if (!loadedHistoryData || loadedHistoryData.length === 0) {
            alert('No stock data available to export.');
            return;
        }
        exportToCsv(currentTicker, currentTimeframe, loadedHistoryData);
    });

    // Model Switcher Event Listener
    document.getElementById('modelSelector').addEventListener('change', () => {
        updatePrediction(currentTicker);
    });

    // Run Backtest Event Listener
    document.getElementById('runBacktestBtn').addEventListener('click', () => {
        runStrategyBacktest(currentTicker);
    });

    // User Menu / Logout Event Listener
    const userGreetingBtn = document.getElementById('userGreetingBtn');
    const userDropdown = document.getElementById('userDropdown');
    userGreetingBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        userDropdown.classList.toggle('hidden');
    });

    document.addEventListener('click', (e) => {
        if (!userGreetingBtn.contains(e.target) && !userDropdown.contains(e.target)) {
            userDropdown.classList.add('hidden');
        }
    });

    document.getElementById('logoutDropdownItem').addEventListener('click', async () => {
        try {
            await auth.signOut();
            await fetch('/api/auth/logout', { method: 'POST' });
            window.location.reload();
        } catch (err) {
            console.error('Logout error:', err);
            window.location.reload();
        }
    });
}

async function fetchSearchResults(query, isLanding = false) {
    const targetResults = isLanding ? document.getElementById('landingSearchResults') : searchResults;
    if (!targetResults) return;

    try {
        const res = await fetch(`/api/search?q=${query}`);
        const data = await res.json();

        targetResults.innerHTML = '';
        if (data.length === 0) {
            targetResults.innerHTML = '<div class="search-item">No results found</div>';
        } else {
            data.forEach(item => {
                const div = document.createElement('div');
                div.className = 'search-item';
                div.innerHTML = `<strong>${item.ticker}</strong> <span>${item.name}</span>`;
                div.addEventListener('click', () => {
                    if (isLanding) {
                        currentTicker = item.ticker;
                        loadTickerData(item.ticker, true);
                        targetResults.classList.add('hidden');
                        document.getElementById('landingTickerSearch').value = '';
                        document.getElementById('guestChartSection').classList.remove('hidden');
                    } else {
                        tickerSearch.value = '';
                        searchResults.classList.add('hidden');
                        currentTicker = item.ticker;
                        loadTickerData(currentTicker);
                    }
                });
                targetResults.appendChild(div);
            });
        }
        targetResults.classList.remove('hidden');
    } catch (err) {
        console.error('Search error:', err);
    }
}

async function loadTickerData(ticker, isGuest = false) {
    try {
        const quoteRes = await fetch(`/api/stock/${ticker}`);
        if (!quoteRes.ok) throw new Error('Failed to fetch quote');
        const quote = await quoteRes.json();

        if (isGuest) {
            const titleEl = document.getElementById('guestStockTitle');
            const priceEl = document.getElementById('guestPriceDisplay');
            if (titleEl) titleEl.textContent = `${ticker} - ${quote.name || ''}`;
            if (priceEl) {
                priceEl.textContent = currencyFmt.format(quote.price);
                priceEl.className = quote.change >= 0 ? 'positive' : 'negative';
            }
        } else {
            stockTicker.textContent = ticker;
            currentPrice.textContent = currencyFmt.format(quote.price);

            changeValue.textContent = (quote.change >= 0 ? '+' : '') + quote.change.toFixed(2);
            changePct.textContent = (quote.change >= 0 ? '+' : '') + quote.pct.toFixed(2) + '%';
            priceChange.className = 'price-change ' + (quote.change >= 0 ? 'positive' : 'negative');

            marketCap.textContent = quote.mktcap ? numFmt.format(quote.mktcap) : '--';
            high52.textContent = quote.high52 ? currencyFmt.format(quote.high52) : '--';
            low52.textContent = quote.low52 ? currencyFmt.format(quote.low52) : '--';

            // New Daily Stats
            document.getElementById('dayOpen').textContent = quote.open ? currencyFmt.format(quote.open) : '--';
            document.getElementById('prevClose').textContent = quote.prevClose ? currencyFmt.format(quote.prevClose) : '--';
            document.getElementById('dayHigh').textContent = quote.dayHigh ? currencyFmt.format(quote.dayHigh) : '--';
            document.getElementById('dayLow').textContent = quote.dayLow ? currencyFmt.format(quote.dayLow) : '--';

            if (quote.price && quote.high52 && quote.low52) {
                gaugeLow.textContent = currencyFmt.format(quote.low52);
                gaugeHigh.textContent = currencyFmt.format(quote.high52);
                let pct = ((quote.price - quote.low52) / (quote.high52 - quote.low52)) * 100;
                pct = Math.max(0, Math.min(100, pct));
                gaugeFill.style.width = `${pct}%`;
            } else {
                gaugeLow.textContent = '--';
                gaugeHigh.textContent = '--';
                gaugeFill.style.width = '0%';
            }
        }

        // Watchlist state is now managed via the 3-dots action menu
    } catch (err) {
        console.error(err);
    }

    await loadHistory(ticker, currentTimeframe, isGuest);
    if (!isGuest) {
        await updatePrediction(ticker);
        await fetchNews(ticker);
    }
}

async function loadHistory(ticker, period, isGuest = false) {
    try {
        const res = await fetch(`/api/history/${ticker}?period=${period}`);
        const data = await res.json();

        if (!Array.isArray(data) || data.length === 0) return;

        loadedHistoryData = data;

        drawMainChart(data, isGuest);
        if (!isGuest) {
            drawVolumeChart(data);
            drawBollingerBands(data);
            drawRsiChart(data);
            drawMacdChart(data);
        }
    } catch (err) {
        console.error('History error:', err);
    }
}

function drawMainChart(data, isGuest = false) {
    const canvasId = isGuest ? 'guestChartCanvas' : 'mainChart';
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    if (mainChart) mainChart.destroy();

    const formattedData = data.map(d => ({
        x: new Date(d.date).valueOf(),
        o: d.open,
        h: d.high,
        l: d.low,
        c: d.close,
        y: d.close
    }));

    const config = {
        type: currentChartType === 'candlestick' ? 'candlestick' : 'line',
        data: {
            datasets: [{
                label: currentTicker,
                data: formattedData,
                borderColor: '#3b82f6',
                backgroundColor: currentChartType === 'line' ? 'rgba(59, 130, 246, 0.1)' : undefined,
                borderWidth: 2,
                fill: currentChartType === 'line',
                pointRadius: 0,
                pointHoverRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'month'
                    },
                    grid: { color: 'rgba(255,255,255,0.05)' }
                },
                y: {
                    grid: { color: 'rgba(255,255,255,0.05)' }
                }
            },
            plugins: {
                legend: { display: false }
            }
        }
    };

    mainChart = new Chart(ctx, config);
}

function drawVolumeChart(data) {
    const ctx = document.getElementById('volumeChart').getContext('2d');

    if (volumeChart) volumeChart.destroy();

    const volumeData = data.map(d => ({
        x: new Date(d.date).valueOf(),
        y: d.volume
    }));

    volumeChart = new Chart(ctx, {
        type: 'bar',
        data: {
            datasets: [{
                label: 'Volume',
                data: volumeData,
                backgroundColor: 'rgba(148, 163, 184, 0.5)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    type: 'time',
                    display: false
                },
                y: {
                    display: false
                }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}

let bbChart = null;
function drawBollingerBands(data) {
    const ctx = document.getElementById('bbChart').getContext('2d');
    if (bbChart) bbChart.destroy();

    const dates = data.map(d => new Date(d.date).valueOf());

    bbChart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [
                { label: 'Close', data: data.map(d => ({ x: new Date(d.date).valueOf(), y: d.close })), borderColor: '#3b82f6', borderWidth: 2, pointRadius: 0, fill: false },
                { label: 'Upper Band', data: data.map(d => ({ x: new Date(d.date).valueOf(), y: d.bb_upper })), borderColor: 'rgba(239, 68, 68, 0.45)', borderDash: [4, 4], borderWidth: 1, pointRadius: 0, fill: false },
                { label: 'Middle Band', data: data.map(d => ({ x: new Date(d.date).valueOf(), y: d.bb_middle })), borderColor: 'rgba(148, 163, 184, 0.3)', borderWidth: 1, pointRadius: 0, fill: false },
                { label: 'Lower Band', data: data.map(d => ({ x: new Date(d.date).valueOf(), y: d.bb_lower })), borderColor: 'rgba(16, 185, 129, 0.45)', borderDash: [4, 4], borderWidth: 1, pointRadius: 0, fill: false }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    type: 'time',
                    grid: { color: 'rgba(255,255,255,0.02)' }
                },
                y: {
                    grid: { color: 'rgba(255,255,255,0.05)' }
                }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}

function drawRsiChart(data) {
    const ctx = document.getElementById('rsiChart').getContext('2d');
    if (rsiChart) rsiChart.destroy();

    rsiChart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [
                { label: 'RSI', data: data.map(d => ({ x: new Date(d.date).valueOf(), y: d.rsi })), borderColor: '#a78bfa', borderWidth: 1.8, pointRadius: 0, fill: false },
                { label: 'Overbought (70)', data: data.map(d => ({ x: new Date(d.date).valueOf(), y: 70 })), borderColor: 'rgba(239, 68, 68, 0.35)', borderDash: [4, 4], borderWidth: 1, pointRadius: 0, fill: false },
                { label: 'Oversold (30)', data: data.map(d => ({ x: new Date(d.date).valueOf(), y: 30 })), borderColor: 'rgba(16, 185, 129, 0.35)', borderDash: [4, 4], borderWidth: 1, pointRadius: 0, fill: false }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    type: 'time',
                    grid: { color: 'rgba(255,255,255,0.02)' }
                },
                y: {
                    min: 0,
                    max: 100,
                    ticks: { stepSize: 20 },
                    grid: { color: 'rgba(255,255,255,0.05)' }
                }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}

let macdChart = null;
function drawMacdChart(data) {
    const ctx = document.getElementById('macdChart').getContext('2d');
    if (macdChart) macdChart.destroy();

    macdChart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [
                { label: 'MACD', data: data.map(d => ({ x: new Date(d.date).valueOf(), y: d.macd_line })), borderColor: '#2563eb', borderWidth: 1.5, pointRadius: 0, fill: false },
                { label: 'Signal', data: data.map(d => ({ x: new Date(d.date).valueOf(), y: d.macd_signal })), borderColor: '#f59e0b', borderWidth: 1.5, pointRadius: 0, fill: false },
                {
                    label: 'Histogram',
                    type: 'bar',
                    data: data.map(d => ({ x: new Date(d.date).valueOf(), y: d.macd_hist })),
                    backgroundColor: data.map(d => d.macd_hist >= 0 ? 'rgba(16, 185, 129, 0.5)' : 'rgba(239, 68, 68, 0.5)'),
                    barPercentage: 0.8
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    type: 'time',
                    grid: { color: 'rgba(255,255,255,0.02)' }
                },
                y: {
                    grid: { color: 'rgba(255,255,255,0.05)' }
                }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}

function exportToCsv(ticker, period, data) {
    const headers = ['Date', 'Open', 'High', 'Low', 'Close', 'Volume', 'BB_Upper', 'BB_Middle', 'BB_Lower', 'RSI', 'MACD', 'MACD_Signal', 'MACD_Hist'];
    const rows = data.map(d => [
        d.date,
        d.open || '',
        d.high || '',
        d.low || '',
        d.close || '',
        d.volume || '',
        d.bb_upper || '',
        d.bb_middle || '',
        d.bb_lower || '',
        d.rsi || '',
        d.macd_line || '',
        d.macd_signal || '',
        d.macd_hist || ''
    ]);

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${ticker}_${period}_data.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

async function fetchNews(ticker) {
    newsGrid.innerHTML = '<div class="news-loading">Loading news...</div>';
    try {
        const res = await fetch(`/api/news/${ticker}`);
        const data = await res.json();

        newsGrid.innerHTML = '';
        if (!data || data.length === 0 || data.status === 'error') {
            newsGrid.innerHTML = '<div class="news-loading">No recent news found.</div>';
            return;
        }

        data.forEach(news => {
            let pubDate;
            if (!isNaN(news.providerPublishTime)) {
                pubDate = new Date(Number(news.providerPublishTime) * 1000);
            } else {
                pubDate = new Date(news.providerPublishTime);
            }
            const dateStr = pubDate.toLocaleString('en-IN', {
                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            });

            let badgeHtml = '';
            if (news.sentiment_label === 'POSITIVE') {
                badgeHtml = `<span style="background: rgba(16, 185, 129, 0.15); color: #10b981; padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; font-weight: 600; margin-left: 8px;">🟢 Positive</span>`;
            } else if (news.sentiment_label === 'NEGATIVE') {
                badgeHtml = `<span style="background: rgba(239, 68, 68, 0.15); color: #ef4444; padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; font-weight: 600; margin-left: 8px;">🔴 Negative</span>`;
            } else {
                badgeHtml = `<span style="background: rgba(245, 158, 11, 0.15); color: #f59e0b; padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; font-weight: 600; margin-left: 8px;">🟡 Neutral</span>`;
            }

            const card = document.createElement('a');
            card.className = 'news-card';
            card.href = news.link;
            card.target = '_blank';
            card.innerHTML = `
                <div class="news-title">${news.title}</div>
                <div class="news-meta">
                    <span>${news.publisher || 'Yahoo Finance'} ${badgeHtml}</span>
                    <span>${dateStr}</span>
                </div>
            `;
            newsGrid.appendChild(card);
        });
    } catch (err) {
        console.error('News error:', err);
        newsGrid.innerHTML = '<div class="news-loading">Failed to load news.</div>';
    }
}

// Global Auth State Helpers
async function checkAuthStatus() {
    return new Promise((resolve) => {
        auth.onAuthStateChanged(async (user) => {
            const authLinks = document.getElementById('authLinks');
            const userMenuContainer = document.getElementById('userMenuContainer');
            const loginLink = document.getElementById('loginLink');
            const guestLanding = document.getElementById('guestLanding');
            const mainDashboard = document.getElementById('mainDashboard');

            if (user) {
                isLoggedIn = true;
                currentUser = { id: user.uid, username: user.displayName || user.email.split('@')[0] };
                document.body.classList.add('is-logged-in');
                if (userMenuContainer) userMenuContainer.classList.remove('hidden');
                if (authLinks) authLinks.classList.remove('hidden');
                if (guestLanding) guestLanding.classList.add('hidden');
                if (mainDashboard) mainDashboard.classList.remove('hidden');
                if (document.getElementById('greetingName')) {
                    document.getElementById('greetingName').textContent = currentUser.username;
                }
                if (loginLink) loginLink.classList.add('hidden');
                await loadWatchlistFromDb();
                startNavClock();

                // Market Indices Refresh
                fetchMarketIndices();
                setInterval(fetchMarketIndices, 60000);
            } else {
                isLoggedIn = false;
                currentUser = null;
                document.body.classList.remove('is-logged-in');
                if (userMenuContainer) userMenuContainer.classList.add('hidden');
                if (authLinks) authLinks.classList.add('hidden');
                if (guestLanding) guestLanding.classList.remove('hidden');
                if (mainDashboard) mainDashboard.classList.add('hidden');
                if (loginLink) loginLink.classList.remove('hidden');
                watchlist = JSON.parse(localStorage.getItem('stocksight_watchlist')) || ['RELIANCE.NS', 'TCS.NS'];

                // Market Indices for guests too
                fetchMarketIndices();
                setInterval(fetchMarketIndices, 60000);
            }
            const appContent = document.getElementById('appContent');
            if (appContent) appContent.classList.remove('hidden-onload');
            resolve();
        });
    });
}

async function loadWatchlistFromDb() {
    try {
        const res = await authenticatedFetch('/api/watchlist/items');
        if (res.ok) {
            watchlist = await res.json();
        }
    } catch (err) {
        console.error('DB watchlist load failed:', err);
    }
}

// Prediction Box Switcher Helper
async function updatePrediction(ticker) {
    try {
        const model = document.getElementById('modelSelector').value;
        const predRes = await authenticatedFetch(`/api/predict/${ticker}?model=${model}`);
        if (predRes.ok) {
            const pred = await predRes.json();
            predictedPrice.textContent = currencyFmt.format(pred.predicted);
            predInterval.textContent = `Interval: ${currencyFmt.format(pred.lower)} to ${currencyFmt.format(pred.upper)}`;
            predMae.textContent = pred.mae.toFixed(2);
            predR2.textContent = pred.r2.toFixed(2);
        } else {
            predictedPrice.textContent = '--';
            predInterval.textContent = 'Interval: -- to --';
            predMae.textContent = '--';
            predR2.textContent = '--';
        }
    } catch (err) {
        console.error('Prediction fetch error:', err);
    }
}

// Backtesting Strategy Controller Helper
let btChartInstance = null;
async function runStrategyBacktest(ticker) {
    const strategy = document.getElementById('backtestStrategy').value;
    const btn = document.getElementById('runBacktestBtn');
    btn.textContent = 'Running...';
    btn.disabled = true;

    try {
        const res = await authenticatedFetch(`/api/backtest/${ticker}?strategy=${strategy}&period=1y`);
        const data = await res.json();

        if (!res.ok) {
            alert(data.message || 'Backtest failed');
            return;
        }

        document.getElementById('backtestResults').classList.remove('hidden');
        document.getElementById('btFinal').textContent = currencyFmt.format(data.final_capital);
        document.getElementById('btReturn').textContent = (data.total_return_pct >= 0 ? '+' : '') + data.total_return_pct.toFixed(2) + '%';
        document.getElementById('btReturn').style.color = data.total_return_pct >= 0 ? '#10b981' : '#ef4444';
        document.getElementById('btTrades').textContent = data.total_trades;
        document.getElementById('btWinRate').textContent = data.win_rate_pct.toFixed(1) + '%';

        // Draw Equity Curve Graph
        const ctx = document.getElementById('btChart').getContext('2d');
        if (btChartInstance) btChartInstance.destroy();

        const dates = data.equity_curve.map(pt => new Date(pt.date).valueOf());

        btChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: dates,
                datasets: [{
                    label: 'Account Equity (₹)',
                    data: data.equity_curve.map(pt => ({ x: new Date(pt.date).valueOf(), y: pt.value })),
                    borderColor: '#10b981',
                    borderWidth: 2,
                    pointRadius: 0,
                    fill: true,
                    backgroundColor: 'rgba(16, 185, 129, 0.05)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        type: 'time',
                        time: { unit: 'month' },
                        grid: { color: 'rgba(255,255,255,0.02)' }
                    },
                    y: {
                        grid: { color: 'rgba(255,255,255,0.05)' }
                    }
                },
                plugins: {
                    legend: { display: false }
                }
            }
        });

    } catch (err) {
        console.error('Backtest query error:', err);
        alert('Failed to execute backtest.');
    } finally {
        btn.textContent = 'Run Simulator';
        btn.disabled = false;
    }
}

function startNavClock() {
    const clockEl = document.getElementById('navClock');
    if (!clockEl) return;

    const update = () => {
        const now = new Date();
        const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        const timeStr = now.toLocaleTimeString('en-IN', { hour12: true });
        clockEl.textContent = `${dateStr}, ${timeStr}`;
    };
    update();
    setInterval(update, 1000);
}

async function fetchMarketIndices() {
    const indices = [
        { id: 'sensex', symbol: '^BSESN' },
        { id: 'nifty', symbol: '^NSEI' }
    ];

    for (const idx of indices) {
        try {
            // Fetch Quote
            const quoteRes = await fetch(`/api/stock/${idx.symbol}`);
            if (!quoteRes.ok) continue;
            const data = await quoteRes.json();

            const priceEl = document.getElementById(`${idx.id}Price`);
            const changeEl = document.getElementById(`${idx.id}Change`);
            const openEl = document.getElementById(`${idx.id}Open`);
            const closeEl = document.getElementById(`${idx.id}PrevClose`);

            if (priceEl) priceEl.textContent = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(data.price);
            if (changeEl) {
                const color = data.change >= 0 ? 'positive' : 'negative';
                const sign = data.change >= 0 ? '+' : '';
                changeEl.textContent = `${sign}${data.change.toFixed(2)} (${sign}${data.pct.toFixed(2)}%)`;
                changeEl.className = color;
            }
            if (openEl) {
                openEl.textContent = data.open ? new Intl.NumberFormat('en-IN').format(data.open) : '--';
            }
            if (closeEl) {
                closeEl.textContent = data.prevClose ? new Intl.NumberFormat('en-IN').format(data.prevClose) : '--';
            }

            // Fetch History for Sparkline (1 month)
            const histRes = await fetch(`/api/history/${idx.symbol}?period=1mo`);
            if (histRes.ok) {
                const hist = await histRes.json();
                renderSparkline(idx.id, hist, data.change >= 0 ? '#10b981' : '#ef4444');
            }
        } catch (err) { console.error(`Failed to fetch ${idx.id}:`, err); }
    }
}

function renderSparkline(id, data, color) {
    const canvas = document.getElementById(`${id}Sparkline`);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    if (id === 'sensex') {
        if (sensexSparklineChart) sensexSparklineChart.destroy();
    } else {
        if (niftySparklineChart) niftySparklineChart.destroy();
    }

    const chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(d => d.date),
            datasets: [{
                data: data.map(d => d.close),
                borderColor: color,
                borderWidth: 2,
                pointRadius: 0,
                fill: true,
                backgroundColor: color + '15', // 15% opacity for better visibility
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { enabled: false } },
            scales: {
                x: { display: false },
                y: { display: false }
            },
            layout: { padding: 2 }
        }
    });

    if (id === 'sensex') sensexSparklineChart = chart;
    else niftySparklineChart = chart;
}
