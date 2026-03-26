const express = require('express');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Proxy: FNMA stock quote via Yahoo Finance
app.get('/api/quote', async (req, res) => {
  try {
    const url = 'https://query1.finance.yahoo.com/v8/finance/chart/FNMA?interval=1d&range=1d';
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json',
      },
    });
    if (!response.ok) throw new Error(`Yahoo Finance returned ${response.status}`);
    const data = await response.json();
    const meta = data.result[0].meta;
    res.json({
      symbol: meta.symbol,
      price: meta.regularMarketPrice,
      previousClose: meta.previousClose,
      change: +(meta.regularMarketPrice - meta.previousClose).toFixed(4),
      changePct: +(((meta.regularMarketPrice - meta.previousClose) / meta.previousClose) * 100).toFixed(2),
      high: meta.regularMarketDayHigh,
      low: meta.regularMarketDayLow,
      volume: meta.regularMarketVolume,
      marketState: meta.marketState,
      currency: meta.currency,
      timestamp: new Date(meta.regularMarketTime * 1000).toISOString(),
    });
  } catch (err) {
    console.error('Quote error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Proxy: FNMA news via Yahoo Finance
app.get('/api/news', async (req, res) => {
  try {
    const url = 'https://query1.finance.yahoo.com/v1/finance/search?q=FNMA+Fannie+Mae&newsCount=10&quotesCount=0';
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json',
      },
    });
    if (!response.ok) throw new Error(`Yahoo Finance returned ${response.status}`);
    const data = await response.json();
    const articles = (data.news || []).slice(0, 10).map(item => ({
      title: item.title,
      publisher: item.publisher,
      link: item.link,
      publishedAt: new Date(item.providerPublishTime * 1000).toISOString(),
      thumbnail: item.thumbnail?.resolutions?.[0]?.url || null,
    }));
    res.json(articles);
  } catch (err) {
    console.error('News error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Proxy: FNMA historical data for sparkline (5 days, hourly)
app.get('/api/history', async (req, res) => {
  try {
    const url = 'https://query1.finance.yahoo.com/v8/finance/chart/FNMA?interval=1h&range=5d';
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json',
      },
    });
    if (!response.ok) throw new Error(`Yahoo Finance returned ${response.status}`);
    const data = await response.json();
    const result = data.result[0];
    const timestamps = result.timestamp || [];
    const closes = result.indicators.quote[0].close || [];
    const points = timestamps.map((t, i) => ({
      t: new Date(t * 1000).toISOString(),
      v: closes[i],
    })).filter(p => p.v != null);
    res.json(points);
  } catch (err) {
    console.error('History error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`FNMA Tracker running at http://localhost:${PORT}`);
});
