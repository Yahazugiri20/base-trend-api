const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send(`
  <html>
    <head>
      <title>Base Trend API</title>

      <style>
        body {
          background: #0a0a0a;
          color: white;
          font-family: Arial, sans-serif;
          padding: 40px;
          max-width: 900px;
          margin: auto;
        }

        h1 {
          color: #4da2ff;
          font-size: 48px;
        }

        .box {
          background: #111827;
          border: 1px solid #1f2937;
          padding: 20px;
          border-radius: 16px;
          margin-top: 20px;
        }

        a {
          color: #60a5fa;
          text-decoration: none;
        }
      </style>
    </head>

    <body>
      <h1>Base Trend API</h1>

      <div class="box">
        <h2>Endpoints</h2>

        <ul>
          <li><a href="/trend/base">/trend/base</a></li>
          <li><a href="/trend/new">/trend/new</a></li>
          <li><a href="/trend/bullish">/trend/bullish</a></li>
          <li><a href="/trend/report">/trend/report</a></li>
        </ul>
      </div>
    </body>
  </html>
  `);
});

async function fetchPairs() {
  const response = await axios.get(
    "https://api.dexscreener.com/latest/dex/pairs/base"
  );

  return response.data.pairs || [];
}

function cleanPairs(pairs) {
  const seen = new Set();

  return pairs
    .filter((p) => p.chainId === "base")
    .filter((p) => p.volume?.h24 > 500)
    .filter((p) => p.liquidity?.usd > 1000)
    .filter((p) => {
      if (seen.has(p.baseToken.symbol)) {
        return false;
      }

      seen.add(p.baseToken.symbol);
      return true;
    })
    .map((p) => ({
      token: p.baseToken.name,
      symbol: p.baseToken.symbol,
      priceUsd: p.priceUsd,
      volume24h: Math.round(p.volume?.h24 || 0),
      liquidityUsd: Math.round(p.liquidity?.usd || 0),
      txns24h: p.txns?.h24?.buys + p.txns?.h24?.sells || 0,
      pairCreatedAt: p.pairCreatedAt,
      dex: p.dexId,
      url: p.url
    }));
}

app.get("/trend/base", async (req, res) => {
  try {
    const rawPairs = await fetchPairs();

    const trending = cleanPairs(rawPairs)
      .sort((a, b) => b.volume24h - a.volume24h)
      .slice(0, 10);

    res.json({
      ecosystem: "Base",
      type: "live trends",
      trending,
      updatedAt: new Date().toISOString()
    });
  } catch {
    res.status(500).json({
      error: "failed to fetch trends"
    });
  }
});

app.get("/trend/new", async (req, res) => {
  try {
    const rawPairs = await fetchPairs();

    const newest = cleanPairs(rawPairs)
      .sort((a, b) => b.pairCreatedAt - a.pairCreatedAt)
      .slice(0, 10);

    res.json({
      ecosystem: "Base",
      type: "new pairs",
      newest,
      updatedAt: new Date().toISOString()
    });
  } catch {
    res.status(500).json({
      error: "failed to fetch new pairs"
    });
  }
});

app.get("/trend/bullish", async (req, res) => {
  try {
    const rawPairs = await fetchPairs();

    const bullish = cleanPairs(rawPairs)
      .filter((p) => p.volume24h > 50000)
      .filter((p) => p.liquidityUsd > 25000)
      .sort((a, b) => b.txns24h - a.txns24h)
      .slice(0, 10);

    res.json({
      ecosystem: "Base",
      type: "bullish momentum",
      bullish,
      updatedAt: new Date().toISOString()
    });
  } catch {
    res.status(500).json({
      error: "failed to fetch bullish tokens"
    });
  }
});

app.get("/trend/report", async (req, res) => {
  try {
    const rawPairs = await fetchPairs();

    const bullish = cleanPairs(rawPairs)
      .filter((p) => p.volume24h > 50000)
      .slice(0, 5);

    const report = {
      dominantNarrative:
        bullish[0]?.symbol === "VIRTUAL"
          ? "AI agent infrastructure"
          : "experimental Base activity",

      hottestTokens: bullish.map((p) => p.symbol),

      summary: `${bullish
        .map((p) => p.symbol)
        .join(", ")} currently lead Base onchain attention.`,

      riskLevel: "high volatility"
    };

    res.json({
      ecosystem: "Base",
      report,
      updatedAt: new Date().toISOString()
    });
  } catch {
    res.status(500).json({
      error: "failed to generate report"
    });
  }
});

module.exports = app;
