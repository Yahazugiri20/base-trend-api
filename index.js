const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    name: "Base Trend API",
    status: "running",
    endpoint: "/trend/base"
  });
});

app.get("/trend/base", async (req, res) => {
  try {
    const keywords = ["ai", "agent", "meme", "virtual", "clanker"];

    const requests = keywords.map((keyword) =>
      axios.get(`https://api.dexscreener.com/latest/dex/search?q=${keyword}`)
    );

    const responses = await Promise.all(requests);
    const allPairs = responses.flatMap((response) => response.data.pairs || []);

    const uniqueTokens = new Map();

    allPairs
      .filter((pair) => pair.chainId === "base")
      .filter((pair) => pair.volume?.h24 > 100)
      .forEach((pair) => {
        const symbol = pair.baseToken?.symbol;
        const current = uniqueTokens.get(symbol);

        if (!current || pair.volume?.h24 > current.volume?.h24) {
          uniqueTokens.set(symbol, pair);
        }
      });

    const pairs = Array.from(uniqueTokens.values())
      .sort((a, b) => (b.volume?.h24 || 0) - (a.volume?.h24 || 0))
      .slice(0, 10)
      .map((pair) => ({
        token: pair.baseToken?.name,
        symbol: pair.baseToken?.symbol,
        priceUsd: pair.priceUsd,
        volume24h: pair.volume?.h24 || 0,
        liquidityUsd: pair.liquidity?.usd || 0,
        dex: pair.dexId,
        pairUrl: pair.url
      }));

    res.json({
      ecosystem: "Base",
      scanKeywords: keywords,
      narrative:
        "Base trend scan focused on AI agents, memes, Clanker-style launches, and onchain attention.",
      trendingPairs: pairs,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: "failed to fetch Base trends"
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Base Trend API running on port ${PORT}`);
});
