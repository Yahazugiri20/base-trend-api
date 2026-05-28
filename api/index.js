const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    name: "Base Trend API",
    status: "live",
    endpoints: {
      baseTrend: "/trend/base",
      summary: "/trend/summary"
    }
  });
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

module.exports = app;
