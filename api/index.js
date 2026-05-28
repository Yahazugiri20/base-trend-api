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

      <p>
        Live Base ecosystem trend scanning API focused on AI agents,
        memes, virtual protocols, and clanker-related activity.
      </p>

      <div class="box">
        <h2>Endpoints</h2>

        <ul>
          <li><a href="/trend/base">/trend/base</a></li>
          <li><a href="/trend/summary">/trend/summary</a></li>
          <li><a href="/agent/feed">/agent/feed</a></li>
          <li><a href="/trend/bullish">/trend/bullish</a></li>
          <li><a href="/trend/report">/trend/report</a></li>
        </ul>
      </div>

      <div class="box">
        <h2>Status</h2>

        <p>Live on Vercel serverless infrastructure.</p>
        <p>Powered by Dexscreener market data.</p>
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
  try {
    const trending = await getBaseTrends();

    res.json({
      ecosystem: "Base",
      topNarrative:
        trending[0]?.symbol === "VIRTUAL"
          ? "AI agent infrastructure continues dominating Base attention."
          : "Experimental Base narratives remain active.",
      trending,
      updatedAt: new Date().toISOString()
    });
  } catch {
    res.status(500).json({
      error: "failed to fetch Base trends"
    });
  }
});

app.get("/trend/summary", async (req, res) => {
  try {
    const trending = await getBaseTrends();

    const hotTokens = trending.map((t) => t.symbol);

    const totalVolume24h = trending.reduce(
      (sum, t) => sum + t.volume24h,
      0
    );

    res.json({
      ecosystem: "Base",
      marketMood:
        totalVolume24h > 1000000 ? "high attention" : "early activity",
      dominantNarrative: hotTokens.includes("VIRTUAL")
        ? "AI agent infrastructure"
        : "experimental Base narratives",
      hotTokens,
      totalTrackedVolume24h: totalVolume24h,
      updatedAt: new Date().toISOString()
    });
  } catch {
    res.status(500).json({
      error: "failed to generate summary"
    });
  }
});

app.get("/agent/feed", async (req, res) => {
  try {
    const trending = await getBaseTrends();

    const topThree = trending
      .slice(0, 3)
      .map((t) => t.symbol)
      .join(", ");

    const totalVolume24h = trending.reduce(
      (sum, t) => sum + t.volume24h,
      0
    );

    res.type("text/plain").send(`
Base market update:

AI agent infrastructure remains dominant on Base.

Top tracked tokens:
${topThree}

Tracked 24h volume:
$${totalVolume24h.toLocaleString()}

Generated from live Dexscreener Base activity.
    `);
  } catch {
    res.status(500).send("failed to generate agent feed");
  }
});

app.get("/trend/bullish", async (req, res) => {
  try {
    const trending = await getBaseTrends();

    const bullishTokens = trending
      .filter((t) => t.volume24h > 50000)
      .filter((t) => t.liquidityUsd > 50000)
      .map((t) => ({
        symbol: t.symbol,
        volume24h: t.volume24h,
        liquidityUsd: t.liquidityUsd,
        conviction:
          t.volume24h > 1000000 ? "very high" : "high"
      }));

    res.json({
      ecosystem: "Base",
      bullishTokens,
      generatedAt: new Date().toISOString()
    });
  } catch {
    res.status(500).json({
      error: "failed to generate bullish trends"
    });
  }
});

app.get("/trend/report", async (req, res) => {
  try {
    const trending = await getBaseTrends();

    const totalVolume24h = trending.reduce(
      (sum, t) => sum + t.volume24h,
      0
    );

    const bullishTokens = trending
      .filter((t) => t.volume24h > 50000)
      .map((t) => t.symbol);

    res.json({
      ecosystem: "Base",
      report: {
        marketMood:
          totalVolume24h > 1000000
            ? "high attention"
            : "early activity",

        dominantNarrative:
          bullishTokens.includes("VIRTUAL")
            ? "AI agent infrastructure"
            : "experimental Base narratives",

        topTokens: bullishTokens,

        risks: [
          "high volatility",
          "rapid narrative rotation",
          "low cap liquidity risk"
        ],

        totalTrackedVolume24h: totalVolume24h,

        generatedFeed: `Base activity is currently dominated by ${bullishTokens.join(
          ", "
        )}. AI agent narratives remain the strongest sector on tracked Base pairs.`
      },

      updatedAt: new Date().toISOString()
    });
  } catch {
    res.status(500).json({
      error: "failed to generate report"
    });
  }
});

module.exports = app;
