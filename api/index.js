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

          code {
            background: #1f2937;
            padding: 2px 6px;
            border-radius: 6px;
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

          <p>
            <a href="/trend/base">/trend/base</a>
          </p>

          <p>
            <a href="/trend/summary">/trend/summary</a>
          </p>

          <p>
            <a href="/agent/feed">/agent/feed</a>
          </p>
        </div>

        <div class="box">
          <h2>Example Use Cases</h2>

          <ul>
            <li>AI agent market context</li>
            <li>Autonomous trading feeds</li>
            <li>Base ecosystem monitoring</li>
            <li>Crypto narrative tracking</li>
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

      if (
        !uniqueTokens.has(symbol) ||
        pair.volume.h24 > uniqueTokens.get(symbol).volume.h24
      ) {
        uniqueTokens.set(symbol, pair);
      }
    });

  const trending = Array.from(uniqueTokens.values())
    .sort((a, b) => (b.volume?.h24 || 0) - (a.volume?.h24 || 0))
    .slice(0, 5)
    .map((pair, index) => ({
      rank: index + 1,
      token: pair.baseToken?.name,
      symbol: pair.baseToken?.symbol,
      priceUsd: pair.priceUsd,
      volume24h: Math.round(pair.volume?.h24 || 0),
      liquidityUsd: Math.round(pair.liquidity?.usd || 0),
      dex: pair.dexId,
      url: pair.url
    }));

  return {
    ecosystem: "Base",
    api: "Base Trend API",
    scanKeywords: keywords,
    trending,
    updatedAt: new Date().toISOString()
  };
}

app.get("/trend/base", async (req, res) => {
  try {
    const data = await getBaseTrends();

    const topNarrative =
      data.trending[0]?.symbol === "VIRTUAL"
        ? "AI agent infrastructure continues dominating Base attention."
        : "Meme and experimental agent coins remain active on Base.";

    res.json({
      ...data,
      topNarrative
    });
  } catch (error) {
    res.status(500).json({
      error: "failed to fetch Base trends"
    });
  }
});

app.get("/trend/summary", async (req, res) => {
  try {
    const data = await getBaseTrends();

    const hotTokens = data.trending.map((item) => item.symbol);
    const totalVolume24h = data.trending.reduce(
      (sum, item) => sum + item.volume24h,
      0
    );

    const dominantNarrative = hotTokens.includes("VIRTUAL")
      ? "AI agent infrastructure"
      : "Base-native experimental tokens";

    const marketMood =
      totalVolume24h > 1000000 ? "high attention" : "early activity";

    res.json({
      ecosystem: "Base",
      marketMood,
      dominantNarrative,
      hotTokens,
      totalTrackedVolume24h: totalVolume24h,
      summary: `Base activity is currently led by ${dominantNarrative}, with ${hotTokens
        .slice(0, 3)
        .join(", ")} showing the strongest live activity across tracked pairs.`,
      updatedAt: data.updatedAt
    });
  } catch (error) {
    res.status(500).json({
      error: "failed to generate Base trend summary"
    });
  }
});

app.get("/agent/feed", async (req, res) => {
  try {
    const data = await getBaseTrends();

    const hotTokens = data.trending.map((item) => item.symbol);
    const totalVolume24h = data.trending.reduce(
      (sum, item) => sum + item.volume24h,
      0
    );

    const topThree = hotTokens.slice(0, 3).join(", ");

    const feed = `Base market update:
AI agent infrastructure is currently the dominant narrative.
Top tracked tokens: ${topThree}.
Tracked 24h volume: $${totalVolume24h.toLocaleString()}.
This feed is generated from live Base DEX activity across AI, agent, meme, virtual, and clanker-related pairs.`;

    res.type("text/plain").send(feed);
  } catch (error) {
    res.status(500).send("failed to generate agent feed");
  }
});

module.exports = app;
