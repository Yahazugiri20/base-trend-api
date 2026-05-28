const express = require("express");
const cors = require("cors");
const axios = require("axios");

const { paymentMiddleware, x402ResourceServer } = require("@x402/express");
const { HTTPFacilitatorClient } = require("@x402/core/server");
const { ExactEvmScheme } = require("@x402/evm/exact/server");

const app = express();

app.use(cors());
app.use(express.json());

const GT = "https://api.geckoterminal.com/api/v2";

const facilitatorClient = new HTTPFacilitatorClient({
  url: "https://x402.org/facilitator"
});

const resourceServer = new x402ResourceServer(facilitatorClient).register(
  "eip155:84532",
  new ExactEvmScheme()
);

app.use(
  paymentMiddleware(
    {
      "GET /trend/report": {
        accepts: [
          {
            scheme: "exact",
            price: "$0.001",
            network: "eip155:84532",
            payTo: "0x389cb82d5E40124938C75873964E283a0cF88876"
          }
        ],
        description:
          "Premium Base momentum report powered by GeckoTerminal.",
        mimeType: "application/json"
      }
    },
    resourceServer
  )
);

app.get("/description", (req, res) => {
  res.json({
    name: "Base Signal API",
    description:
      "Real-time Base ecosystem signal API powered by GeckoTerminal and protected with x402.",
    website: "https://base-trend-api.vercel.app",
    category: "Crypto",
    resources: [
      {
        name: "Base Premium Momentum Report",
        method: "GET",
        path: "/trend/report",
        price: "$0.001"
      },
      {
        name: "Base Trending Pools",
        method: "GET",
        path: "/trend/base",
        price: "free"
      },
      {
        name: "Base Momentum Signals",
        method: "GET",
        path: "/trend/momentum",
        price: "free"
      }
    ]
  });
});

app.get("/", (req, res) => {
  res.json({
    name: "Base Signal API",
    status: "live",
    description: "/description"
  });
});

async function gt(path) {
  const res = await axios.get(`${GT}${path}`, {
    timeout: 12000,
    headers: {
      accept: "application/json"
    }
  });

  return res.data;
}

function buildIncludedMap(included = []) {
  const map = new Map();

  for (const item of included) {
    map.set(item.id, {
      ...item.attributes
    });
  }

  return map;
}

function getRel(item, includedMap, relName) {
  const id = item.relationships?.[relName]?.data?.id;
  return id ? includedMap.get(id) : null;
}

function normalizePools(payload) {
  const includedMap = buildIncludedMap(payload.included || []);

  return (payload.data || []).map((item) => {
    const a = item.attributes || {};

    const baseToken = getRel(item, includedMap, "base_token");
    const quoteToken = getRel(item, includedMap, "quote_token");
    const dex = getRel(item, includedMap, "dex");

    const volume1h = Number(a.volume_usd?.h1 || 0);
    const volume24h = Number(a.volume_usd?.h24 || 0);

    const buys1h = Number(a.transactions?.h1?.buys || 0);
    const sells1h = Number(a.transactions?.h1?.sells || 0);

    const txns1h = buys1h + sells1h;

    const liquidityUsd = Number(a.reserve_in_usd || 0);

    const score =
      volume1h * 0.4 +
      txns1h * 50 +
      buys1h * 20 +
      liquidityUsd * 0.03;

    return {
      poolName: a.name,
      baseSymbol: baseToken?.symbol || null,
      quoteSymbol: quoteToken?.symbol || null,
      dex: dex?.name || null,
      liquidityUsd: Math.round(liquidityUsd),
      volume1h: Math.round(volume1h),
      volume24h: Math.round(volume24h),
      txns1h,
      score,
      url: `https://www.geckoterminal.com/base/pools/${a.address}`
    };
  });
}

function cleanSignals(pools) {
  return pools
    .filter((p) => p.baseSymbol)
    .filter((p) => p.liquidityUsd >= 1000)
    .filter((p) => p.volume24h >= 1000);
}

app.get("/trend/base", async (req, res) => {
  try {
    const payload = await gt(
      "/networks/base/trending_pools?include=base_token,quote_token,dex"
    );

    const pools = cleanSignals(normalizePools(payload))
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);

    res.json({
      source: "GeckoTerminal",
      network: "base",
      pools
    });
  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});

app.get("/trend/momentum", async (req, res) => {
  try {
    const payload = await gt(
      "/networks/base/trending_pools?include=base_token,quote_token,dex"
    );

    const signals = cleanSignals(normalizePools(payload))
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);

    res.json({
      source: "GeckoTerminal",
      network: "base",
      signals
    });
  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});

app.get("/trend/report", async (req, res) => {
  try {
    const payload = await gt(
      "/networks/base/trending_pools?include=base_token,quote_token,dex"
    );

    const signals = cleanSignals(normalizePools(payload))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    res.json({
      premium: true,
      source: "GeckoTerminal",
      report: signals
    });
  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});

module.exports = app;
