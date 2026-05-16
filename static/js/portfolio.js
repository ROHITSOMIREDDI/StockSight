let portfolio = [];
let isDarkMode = localStorage.getItem('stocksight_theme') !== 'light';
let isLoggedIn = false;

const holdingsTableBody = document.getElementById('holdingsTableBody');
const themeToggleBtn = document.getElementById('themeToggleBtn');
const holdingForm = document.getElementById('holdingForm');

const tickerInput = document.getElementById('tickerInput');
const sharesInput = document.getElementById('sharesInput');
const buyPriceInput = document.getElementById('buyPriceInput');

const totalInvestedEl = document.getElementById('totalInvested');
const currentValueEl = document.getElementById('currentValue');
const totalPLEl = document.getElementById('totalPL');
const totalROIEl = document.getElementById('totalROI');

const currencyFmt = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });
const percentFmt = new Intl.NumberFormat('en-IN', { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2 });

document.addEventListener('DOMContentLoaded', async () => {
    applyTheme();
    await checkAuthStatus();
    await loadPortfolio();
    setupEventListeners();
    startNavClock();
});

async function checkAuthStatus() {
    return new Promise((resolve) => {
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                isLoggedIn = true;
                try {
                    const portRes = await authenticatedFetch('/api/portfolio');
                    if (portRes.ok) {
                        portfolio = await portRes.json();
                    }
                } catch (err) { console.error(err); }
            } else {
                isLoggedIn = false;
                portfolio = JSON.parse(localStorage.getItem('stocksight_portfolio')) || [];
            }
            const content = document.getElementById('portfolioContent');
            if (content) content.classList.remove('hidden-onload');
            resolve();
        });
    });
}

function applyTheme() {
    if (isDarkMode) {
        document.body.classList.remove('light-theme');
        document.body.classList.add('dark-theme');
        themeToggleBtn.textContent = '☀️';
    } else {
        document.body.classList.remove('dark-theme');
        document.body.classList.add('light-theme');
        themeToggleBtn.textContent = '🌙';
    }
}

function setupEventListeners() {
    themeToggleBtn.addEventListener('click', () => {
        isDarkMode = !isDarkMode;
        localStorage.setItem('stocksight_theme', isDarkMode ? 'dark' : 'light');
        applyTheme();
    });

    holdingForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const ticker = tickerInput.value.trim().toUpperCase();
        const shares = parseFloat(sharesInput.value);
        const buyPrice = parseFloat(buyPriceInput.value);

        if (!ticker || isNaN(shares) || isNaN(buyPrice)) return;

        if (isLoggedIn) {
            try {
                const res = await authenticatedFetch('/api/portfolio', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ticker, shares, buyPrice })
                });
                if (res.ok) {
                    const portRes = await authenticatedFetch('/api/portfolio');
                    if (portRes.ok) portfolio = await portRes.json();
                }
            } catch (err) {
                console.error('Add holding DB failed:', err);
            }
        } else {
            // Check for duplicates and merge or append
            const existingIndex = portfolio.findIndex(item => item.ticker === ticker);
            if (existingIndex > -1) {
                // Recalculate average buy price
                const existing = portfolio[existingIndex];
                const newTotalCost = (existing.shares * existing.buyPrice) + (shares * buyPrice);
                const newShares = existing.shares + shares;
                existing.shares = newShares;
                existing.buyPrice = newTotalCost / newShares;
            } else {
                portfolio.push({ ticker, shares, buyPrice });
            }
            localStorage.setItem('stocksight_portfolio', JSON.stringify(portfolio));
        }
        
        // Reset Inputs
        tickerInput.value = '';
        sharesInput.value = '';
        buyPriceInput.value = '';

        await loadPortfolio();
    });
}

async function loadPortfolio() {
    if (portfolio.length === 0) {
        renderEmptyState();
        return;
    }

    holdingsTableBody.innerHTML = '<tr><td colspan="7" class="empty-portfolio">Fetching live quotes...</td></tr>';

    let totalInvested = 0;
    let totalCurrent = 0;

    // Fetch prices for all holdings concurrently
    const promises = portfolio.map(async (holding) => {
        try {
            const res = await fetch(`/api/stock/${holding.ticker}`);
            if (!res.ok) throw new Error('Fetch failed');
            const data = await res.json();
            return { ...holding, currentPrice: data.price, name: data.name, success: true };
        } catch (err) {
            return { ...holding, success: false };
        }
    });

    const results = await Promise.all(promises);
    holdingsTableBody.innerHTML = '';

    results.forEach((holding, idx) => {
        const cost = holding.shares * holding.buyPrice;
        totalInvested += cost;

        const row = document.createElement('tr');
        row.dataset.ticker = holding.ticker;

        if (holding.success) {
            const currentVal = holding.shares * holding.currentPrice;
            totalCurrent += currentVal;

            const pl = currentVal - cost;
            const roi = pl / cost;
            const sign = pl >= 0 ? '+' : '';
            const colorClass = pl >= 0 ? 'positive' : 'negative';

            row.innerHTML = `
                <td>
                    <span class="holding-ticker">${holding.ticker}</span>
                    <span class="holding-name">${holding.name || 'NSE/BSE Asset'}</span>
                </td>
                <td>${holding.shares.toFixed(2)}</td>
                <td>${currencyFmt.format(holding.buyPrice)}</td>
                <td>${currencyFmt.format(holding.currentPrice)}</td>
                <td style="font-weight: 600;">${currencyFmt.format(currentVal)}</td>
                <td class="${colorClass}" style="font-weight: 600;">
                    ${sign}${currencyFmt.format(pl)}<br>
                    <span style="font-size: 0.8rem;">${sign}${percentFmt.format(roi)}</span>
                </td>
                <td style="text-align: center;">
                    <a href="/?ticker=${holding.ticker}" class="view-chart-btn" style="padding: 4px 10px; font-size: 0.75rem; display: inline-block; margin-right: 8px;">Chart</a>
                    <button class="delete-btn" onclick="removeHolding('${holding.ticker}')" title="Delete Holding">✖</button>
                </td>
            `;
        } else {
            // Fallback for failed quote fetches
            row.innerHTML = `
                <td>
                    <span class="holding-ticker">${holding.ticker}</span>
                    <span class="holding-name" style="color: var(--negative);">Failed to fetch live quote</span>
                </td>
                <td>${holding.shares.toFixed(2)}</td>
                <td>${currencyFmt.format(holding.buyPrice)}</td>
                <td>--</td>
                <td>--</td>
                <td>--</td>
                <td style="text-align: center;">
                    <button class="delete-btn" onclick="removeHolding('${holding.ticker}')" title="Delete Holding">✖</button>
                </td>
            `;
        }
        holdingsTableBody.appendChild(row);
    });

    // Update Overall Summary Cards
    totalInvestedEl.textContent = currencyFmt.format(totalInvested);
    currentValueEl.textContent = currencyFmt.format(totalCurrent);
    
    const netPL = totalCurrent - totalInvested;
    const netROI = totalInvested > 0 ? (netPL / totalInvested) : 0;
    
    const plSign = netPL >= 0 ? '+' : '';
    const plClass = netPL >= 0 ? 'positive' : 'negative';
    
    totalPLEl.textContent = `${plSign}${currencyFmt.format(netPL)}`;
    totalPLEl.className = `summary-value ${plClass}`;
    
    totalROIEl.textContent = `${plSign}${percentFmt.format(netROI)}`;
    totalROIEl.className = `summary-value ${plClass}`;
}

async function removeHolding(ticker) {
    portfolio = portfolio.filter(item => item.ticker !== ticker);
    if (isLoggedIn) {
        try {
            await authenticatedFetch(`/api/portfolio/${ticker}`, { method: 'DELETE' });
            const portRes = await authenticatedFetch('/api/portfolio');
            if (portRes.ok) portfolio = await portRes.json();
        } catch (err) {
            console.error('Delete holding DB failed:', err);
        }
    } else {
        localStorage.setItem('stocksight_portfolio', JSON.stringify(portfolio));
    }

    const row = document.querySelector(`tr[data-ticker="${ticker}"]`);
    if (row) {
        row.style.opacity = '0';
        row.style.transform = 'scale(0.95)';
        row.style.transition = 'all 0.3s ease';
        setTimeout(async () => {
            row.remove();
            if (portfolio.length === 0) {
                renderEmptyState();
                totalInvestedEl.textContent = '₹0.00';
                currentValueEl.textContent = '₹0.00';
                totalPLEl.textContent = '₹0.00';
                totalPLEl.className = 'summary-value';
                totalROIEl.textContent = '0.00%';
                totalROIEl.className = 'summary-value';
            } else {
                await loadPortfolio();
            }
        }, 300);
    }
}

function renderEmptyState() {
    holdingsTableBody.innerHTML = `
        <tr>
            <td colspan="7" class="empty-portfolio">
                Your portfolio tracking ledger is currently empty. Enter assets above!
            </td>
        </tr>
    `;
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
