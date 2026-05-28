const express = require("express");
const cors = require("cors");
const axios = require("axios");

const { paymentMiddleware } = require("x402-express");

const app = express();

app.use(cors());
app.use(express.json());

app.use(
  paymentMiddleware({
    receiver:
      "0x000000000000000000000000000000000000dead",

    routes: {
      "/trend/report": {
        price: "$0.001",
        network: "base-sepolia"
      }
    }
  })
);

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

      <p>
        AI agent market intelligence API for Base ecosystem activity.
      </p>

      <div class="box">
        <h2>Endpoints</h2>

        <ul>
          <li><a href="/trend/base">/trend/base</a></li>
          <li><a href="/trend/summary">/trend/summary</a></li>
          <li><a href="/agent/feed">/agent/feed</a></li>
          <li><a href="/trend/bullish">/trend/bullish</a></li>
          <li><a href="/trend/report">/trend/report (x402 protected)</a></li>
        </ul>
      </div>
    </body>
  </html>
  `);
});

async function getBaseTrends() {
  const keywords = ["ai", "agent", "meme", "virtual", "clanker"];

  const requests = keywords.map((keyword) =>
    axios.get(`https://api.dexscreener.com/latest/dex/search?q=${keyword}`)
  );

  const responses = await Promise.all(requests);
  const allPairs = responses.flatMap((r) => r.data.pairs || []);

  const uniqueTokens = new Map();

  allPairs
    .filter((pair) => pair.chainId === "base")
    .filter((pair) => pair.volume?.h24 > 100)
    .forEach((pair) => {
      const symbol = pair.baseToken?.symbol;

      if (!symbol) return;

      const existing = uniqueTokens.get(symbol);

      if (!existing || pair.volume.h24 > existing.volume24h) {
        uniqueTokens.set(symbol, {
          token: pair.baseToken?.name,
          symbol: pair.baseToken?.symbol,
          priceUsd: pair.priceUsd,
          volume24h: Math.round(pair.volume?.h24 || 0),
          liquidityUsd: Math.round(pair.liquidity?.usd || 0),
          dex: pair.dexId,
          url: pair.url
        });
      }
    });

  return Array.from(uniqueTokens.values())
    .sort((a, b) => b.volume24h - a.volume24h)
    .slice(0, 5)
    .map((token, index) => ({
      rank: index + 1,
      ...token
    }));
}

app.get("/trend/base", async (req, res) => {
  const trending = await getBaseTrends();

  res.json({
    ecosystem: "Base",
    trending,
    updatedAt: new Date().toISOString()
  });
});

app.get("/trend/summary", async (req, res) => {
  const trending = await getBaseTrends();

  const hotTokens = trending.map((t) => t.symbol);

  res.json({
    ecosystem: "Base",
    dominantNarrative: "AI agent infrastructure",
    hotTokens,
    updatedAt: new Date().toISOString()
  });
});

app.get("/agent/feed", async (req, res) => {
  const trending = await getBaseTrends();

  const topThree = trending
    .slice(0, 3)
    .map((t) => t.symbol)
    .join(", ");

  res.type("text/plain").send(`
Base market update:

Top tracked tokens:
${topThree}

Generated from live Base activity.
  `);
});

app.get("/trend/bullish", async (req, res) => {
  const trending = await getBaseTrends();

  const bullishTokens = trending
    .filter((t) => t.volume24h > 50000)
    .map((t) => ({
      symbol: t.symbol,
      volume24h: t.volume24h,
      liquidityUsd: t.liquidityUsd
    }));

  res.json({
    ecosystem: "Base",
    bullishTokens,
    generatedAt: new Date().toISOString()
  });
});

app.get("/trend/report", async (req, res) => {
  const trending = await getBaseTrends();

  res.json({
    ecosystem: "Base",
    report: trending,
    premium: true,
    updatedAt: new Date().toISOString()
  });
});

module.exports = app;
