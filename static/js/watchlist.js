let allWatchlists = [];
let currentWatchlistIndex = 0;
let selectedTicker = null;
let currentTimeframe = '1y';
let currentChartType = 'candlestick';
let mainChart = null;
let isLoggedIn = false;
let isDarkMode = localStorage.getItem('stocksight_theme') !== 'light';
const themeToggleBtn = document.getElementById('themeToggleBtn');

// DOM Elements - Sidebar
const mwList = document.getElementById('mwList');
const mwTabs = document.getElementById('mwTabs');
const mwSearchInput = document.getElementById('mwSearchInput');
const mwSearchResults = document.getElementById('mwSearchResults');
const createWatchlistBtn = document.getElementById('createWatchlistBtn');
const createWatchlistModal = document.getElementById('createWatchlistModal');
const newWatchlistName = document.getElementById('newWatchlistName');
const confirmCreateWl = document.getElementById('confirmCreateWl');
const cancelCreateWl = document.getElementById('cancelCreateWl');
const deleteWatchlistBtn = document.getElementById('deleteWatchlistBtn');

// DOM Elements - Main
const terminalMain = document.getElementById('terminalMain');
const noSelectionState = document.getElementById('noSelectionState');
const tickerDetails = document.getElementById('tickerDetails');
const mainTicker = document.getElementById('mainTicker');
const mainName = document.getElementById('mainName');
const mainPrice = document.getElementById('mainPrice');
const mainChange = document.getElementById('mainChange');
const mainAddPortfolio = document.getElementById('mainAddPortfolio');
const mainChartCanvas = document.getElementById('mainChartCanvas');
const modelSelector = document.getElementById('modelSelector');
const predValue = document.getElementById('predValue');
const predMetrics = document.getElementById('predMetrics');
const newsGrid = document.getElementById('newsGrid');

const currencyFmt = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });
const numFmt = new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 });

document.addEventListener('DOMContentLoaded', async () => {
    applyTheme();
    await checkAuthStatus();
    if (!isLoggedIn) {
        window.location.href = '/login';
        return;
    }
    setupEventListeners();
    renderTabs();
    startNavClock();
    await loadInitialData();
});

async function checkAuthStatus() {
    return new Promise((resolve) => {
        auth.onAuthStateChanged((user) => {
            isLoggedIn = !!user;
            const content = document.getElementById('terminalContent');
            if (content) content.classList.remove('hidden-onload');
            resolve();
        });
    });
}

async function loadInitialData() {
    try {
        const listRes = await authenticatedFetch('/api/watchlists');
        const lists = await listRes.json();
        
        allWatchlists = [{ id: null, name: 'Watchlist 1', tickers: [] }];
        const mainTickersRes = await authenticatedFetch('/api/watchlist/items');
        allWatchlists[0].tickers = await mainTickersRes.json();
        
        for (const l of lists) {
            const tRes = await authenticatedFetch(`/api/watchlist/items?watchlist_id=${l.id}`);
            const tickers = await tRes.json();
            allWatchlists.push({ id: l.id, name: l.name, tickers });
        }
        
        renderTabs();
        renderMarketWatch();
    } catch (err) {
        console.error('Data load failed:', err);
    }
}

function renderTabs() {
    mwTabs.innerHTML = '';
    allWatchlists.forEach((list, index) => {
        const tab = document.createElement('div');
        tab.className = `mw-tab ${index === currentWatchlistIndex ? 'active' : ''}`;
        tab.textContent = list.name;
        tab.onclick = () => {
            currentWatchlistIndex = index;
            renderTabs();
            renderMarketWatch();
        };
        mwTabs.appendChild(tab);
    });
    
    // Show/Hide delete button based on current selection
    const currentList = allWatchlists[currentWatchlistIndex];
    if (currentList && currentList.id) {
        deleteWatchlistBtn.classList.remove('hidden');
    } else {
        deleteWatchlistBtn.classList.add('hidden');
    }
}

async function renderMarketWatch() {
    const list = allWatchlists[currentWatchlistIndex];
    mwList.innerHTML = '<div style="padding:20px; text-align:center; font-size:0.8rem; color:var(--text-secondary);">Loading list...</div>';
    
    if (list.tickers.length === 0) {
        mwList.innerHTML = '<div style="padding:40px 20px; text-align:center; font-size:0.8rem; color:var(--text-secondary);">List is empty. Search to add stocks.</div>';
        return;
    }

    const rowsHtml = await Promise.all(list.tickers.map(async (ticker) => {
        try {
            const res = await fetch(`/api/stock/${ticker}`);
            const q = await res.json();
            const color = q.change >= 0 ? 'positive' : 'negative';
            const sign = q.change >= 0 ? '+' : '';
            const isActive = selectedTicker === ticker;
            
            return `
                <div class="mw-row ${isActive ? 'active' : ''}" onclick="selectTicker('${ticker}')">
                    <div class="mw-row-left">
                        <h4>${ticker}</h4>
                        <p>${q.name || ''}</p>
                    </div>
                    <div class="mw-row-right">
                        <div class="mw-row-price ${color}">${currencyFmt.format(q.price)}</div>
                        <div class="mw-row-change ${color}">${sign}${q.pct.toFixed(2)}%</div>
                    </div>
                    <div class="mw-row-actions">
                        <div class="mw-action-btn" title="Add to Portfolio" onclick="event.stopPropagation(); openPortfolioModal('${ticker}', ${q.price})">💼</div>
                        <div class="mw-action-btn delete" title="Remove" onclick="event.stopPropagation(); removeFromWatchlist('${ticker}')">🗑</div>
                    </div>
                </div>
            `;
        } catch (err) {
            return `<div class="mw-row"><div><h4>${ticker}</h4><p>Error loading</p></div></div>`;
        }
    }));
    
    mwList.innerHTML = rowsHtml.join('');
}

function selectTicker(ticker) {
    selectedTicker = ticker;
    noSelectionState.classList.add('hidden');
    tickerDetails.classList.remove('hidden');
    
    // Highlight active row
    document.querySelectorAll('.mw-row').forEach(row => {
        row.classList.toggle('active', row.querySelector('h4').textContent === ticker);
    });
    
    loadTickerFullData(ticker);
}

async function loadTickerFullData(ticker) {
    mainTicker.textContent = ticker;
    mainName.textContent = 'Loading...';
    mainPrice.textContent = '₹0.00';
    mainChange.textContent = '--';
    
    try {
        const res = await fetch(`/api/stock/${ticker}`);
        const q = await res.json();
        
        mainName.textContent = q.name || '';
        mainPrice.textContent = currencyFmt.format(q.price);
        const sign = q.change >= 0 ? '+' : '';
        const color = q.change >= 0 ? 'positive' : 'negative';
        mainChange.textContent = `${sign}${q.change.toFixed(2)} (${sign}${q.pct.toFixed(2)}%)`;
        mainChange.className = color;
        
        document.getElementById('statCap').textContent = q.mktcap ? numFmt.format(q.mktcap) : '--';
        document.getElementById('statHigh52').textContent = q.high52 ? currencyFmt.format(q.high52) : '--';
        document.getElementById('statLow52').textContent = q.low52 ? currencyFmt.format(q.low52) : '--';
        document.getElementById('statOpen').textContent = q.open ? currencyFmt.format(q.open) : '--';
        document.getElementById('statPrevClose').textContent = q.prevClose ? currencyFmt.format(q.prevClose) : '--';
        document.getElementById('statDayHigh').textContent = q.dayHigh ? currencyFmt.format(q.dayHigh) : '--';
        document.getElementById('statDayLow').textContent = q.dayLow ? currencyFmt.format(q.dayLow) : '--';
        
    } catch (err) { console.error(err); }
    
    loadHistory(ticker, currentTimeframe);
    updatePrediction(ticker);
    fetchNews(ticker);
}

async function loadHistory(ticker, period) {
    try {
        const res = await fetch(`/api/history/${ticker}?period=${period}`);
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
            drawChart(data);
        }
    } catch (err) { console.error(err); }
}

function drawChart(data) {
    const ctx = mainChartCanvas.getContext('2d');
    if (mainChart) mainChart.destroy();

    const formattedData = data.map(d => ({
        x: new Date(d.date).valueOf(),
        o: d.open, h: d.high, l: d.low, c: d.close, y: d.close
    }));

    mainChart = new Chart(ctx, {
        type: currentChartType === 'candlestick' ? 'candlestick' : 'line',
        data: {
            datasets: [{
                label: selectedTicker,
                data: formattedData,
                borderColor: '#3b82f6',
                borderWidth: 2,
                pointRadius: 0,
                fill: currentChartType === 'line',
                backgroundColor: 'rgba(59, 130, 246, 0.05)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { type: 'time', time: { unit: 'month' }, grid: { color: 'rgba(255,255,255,0.02)' } },
                y: { grid: { color: 'rgba(255,255,255,0.05)' } }
            },
            plugins: { legend: { display: false } }
        }
    });
}

async function updatePrediction(ticker) {
    predValue.textContent = 'Calculating...';
    try {
        const model = modelSelector.value;
        const res = await authenticatedFetch(`/api/predict/${ticker}?model=${model}`);
        const p = await res.json();
        if (res.ok) {
            predValue.textContent = currencyFmt.format(p.predicted);
            predMetrics.textContent = `MAE: ${p.mae.toFixed(2)} | R²: ${p.r2.toFixed(2)}`;
        } else {
            predValue.textContent = '--';
        }
    } catch (err) { predValue.textContent = 'Error'; }
}

async function fetchNews(ticker) {
    newsGrid.innerHTML = '<div style="color:var(--text-secondary);">Loading news...</div>';
    try {
        const res = await fetch(`/api/news/${ticker}`);
        const data = await res.json();
        newsGrid.innerHTML = '';
        if (!data || data.length === 0) {
            newsGrid.innerHTML = '<div style="color:var(--text-secondary);">No recent news.</div>';
            return;
        }
        data.slice(0, 6).forEach(n => {
            const card = document.createElement('a');
            card.className = 'news-card';
            card.href = n.link;
            card.target = '_blank';
            card.innerHTML = `
                <div class="news-title" style="font-size:0.9rem; font-weight:600; margin-bottom:10px;">${n.title}</div>
                <div style="font-size:0.75rem; color:var(--text-secondary); display:flex; justify-content:space-between;">
                    <span>${n.publisher}</span>
                    <span>${new Date(n.providerPublishTime * 1000).toLocaleDateString()}</span>
                </div>
            `;
            newsGrid.appendChild(card);
        });
    } catch (err) { newsGrid.innerHTML = 'Error loading news'; }
}

function setupEventListeners() {
    // Search logic
    let searchTimeout;
    mwSearchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        const q = e.target.value.trim();
        if (q.length < 1) { mwSearchResults.classList.add('hidden'); return; }
        searchTimeout = setTimeout(async () => {
            const res = await fetch(`/api/search?q=${q}`);
            const data = await res.json();
            mwSearchResults.innerHTML = '';
            data.forEach(item => {
                const div = document.createElement('div');
                div.className = 'search-item';
                div.innerHTML = `<strong>${item.ticker}</strong> <span>${item.name}</span>`;
                div.onclick = () => addToWatchlist(item.ticker);
                mwSearchResults.appendChild(div);
            });
            mwSearchResults.classList.remove('hidden');
        }, 300);
    });

    document.addEventListener('click', (e) => {
        if (!mwSearchInput.contains(e.target) && !mwSearchResults.contains(e.target)) {
            mwSearchResults.classList.add('hidden');
        }
    });


    // Watchlist creation
    createWatchlistBtn.onclick = () => createWatchlistModal.classList.remove('hidden');
    cancelCreateWl.onclick = () => createWatchlistModal.classList.add('hidden');
    confirmCreateWl.onclick = async () => {
        const name = newWatchlistName.value.trim();
        if (!name) return;
        const res = await authenticatedFetch('/api/watchlists', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });
        const data = await res.json();
        if (res.ok) {
            allWatchlists.push({ id: data.id, name, tickers: [] });
            currentWatchlistIndex = allWatchlists.length - 1;
            renderTabs();
            renderMarketWatch();
        }
        createWatchlistModal.classList.add('hidden');
    };

    // Timeframe & Chart buttons
    document.querySelectorAll('.tf-btn').forEach(btn => {
        btn.onclick = (e) => {
            document.querySelectorAll('.tf-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentTimeframe = e.target.dataset.period;
            loadHistory(selectedTicker, currentTimeframe);
        };
    });
    document.querySelectorAll('.ct-btn').forEach(btn => {
        btn.onclick = (e) => {
            document.querySelectorAll('.ct-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentChartType = e.target.dataset.type;
            if (mainChart) drawChart(mainChart.data.datasets[0].data);
        };
    });

    modelSelector.onchange = () => updatePrediction(selectedTicker);

    // Watchlist deletion
    deleteWatchlistBtn.onclick = async () => {
        const list = allWatchlists[currentWatchlistIndex];
        if (!list || !list.id) return;
        
        if (!confirm(`Are you sure you want to delete the entire watchlist "${list.name}"?`)) return;
        
        try {
            const res = await authenticatedFetch(`/api/watchlists/${list.id}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                allWatchlists.splice(currentWatchlistIndex, 1);
                currentWatchlistIndex = 0;
                renderTabs();
                renderMarketWatch();
                
                // Hide details if the selected ticker was in that list and not in the new one
                // (Simpler: just reset selection if needed, or just let it stay if it exists elsewhere)
            } else {
                const data = await res.json();
                alert('Error deleting watchlist: ' + data.message);
            }
        } catch (err) {
            console.error('Delete watchlist error:', err);
            alert('Failed to delete watchlist.');
        }
    };

    // Theme toggle
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    themeToggleBtn.onclick = () => {
        isDarkMode = !isDarkMode;
        localStorage.setItem('stocksight_theme', isDarkMode ? 'dark' : 'light');
        applyTheme();
    };

    // Portfolio Modals
    mainAddPortfolio.onclick = () => openPortfolioModal(selectedTicker, parseFloat(mainPrice.textContent.replace(/[^0-9.]/g, '')));
    document.getElementById('closePortfolioBtn').onclick = () => document.getElementById('addPortfolioModal').classList.add('hidden');
    document.getElementById('savePortfolioBtn').onclick = async () => {
        const shares = parseFloat(document.getElementById('portSharesInput').value);
        const price = parseFloat(document.getElementById('portBuyPriceInput').value);
        if (isNaN(shares) || isNaN(price)) return;
        const ticker = document.getElementById('portTickerInput').value;
        await authenticatedFetch('/api/portfolio', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ticker, shares, buyPrice: price })
        });
        alert('Added to portfolio!');
        document.getElementById('addPortfolioModal').classList.add('hidden');
    };
}

async function addToWatchlist(ticker) {
    const list = allWatchlists[currentWatchlistIndex];
    if (list.tickers.includes(ticker)) return;
    list.tickers.push(ticker);
    await authenticatedFetch('/api/watchlist/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker, watchlist_id: list.id })
    });
    mwSearchInput.value = '';
    mwSearchResults.classList.add('hidden');
    renderMarketWatch();
    selectTicker(ticker);
}

async function removeFromWatchlist(ticker) {
    if (!confirm(`Remove ${ticker} from this list?`)) return;
    const list = allWatchlists[currentWatchlistIndex];
    list.tickers = list.tickers.filter(t => t !== ticker);
    let url = `/api/watchlist/items?ticker=${ticker}`;
    if (list.id) url += `&watchlist_id=${list.id}`;
    await authenticatedFetch(url, { method: 'DELETE' });
    renderMarketWatch();
    if (selectedTicker === ticker) {
        tickerDetails.classList.add('hidden');
        noSelectionState.classList.remove('hidden');
        selectedTicker = null;
    }
}

function openPortfolioModal(ticker, price) {
    document.getElementById('portTickerInput').value = ticker;
    document.getElementById('portBuyPriceInput').value = price;
    document.getElementById('portSharesInput').value = '';
    document.getElementById('addPortfolioModal').classList.remove('hidden');
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

function applyTheme() {
    if (isDarkMode) {
        document.body.classList.remove('light-theme');
        document.body.classList.add('dark-theme');
        if (themeToggleBtn) themeToggleBtn.textContent = '☀️';
    } else {
        document.body.classList.remove('dark-theme');
        document.body.classList.add('light-theme');
        if (themeToggleBtn) themeToggleBtn.textContent = '🌙';
    }
}
