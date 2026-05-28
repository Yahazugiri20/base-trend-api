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
const PAY_TO_ADDRESS = "0xISI_WALLET_BASE_LU_DI_SINI";

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
          "Real Base momentum report using GeckoTerminal pool data, liquidity, volume, transactions, and momentum scoring.",
        mimeType: "application/json"
      }
    },
    resourceServer
  )
);

app.get("/", (req, res) => {
  res.send(`
  <html>
    <head>
      <title>Base Signal API</title>
      <style>
        body { background:#050505; color:white; font-family:Arial,sans-serif; padding:40px; max-width:900px; margin:auto; }
        h1 { color:#4da2ff; font-size:48px; }
        .box { background:#111827; border:1px solid #1f2937; padding:20px; border-radius:16px; margin-top:20px; }
        a { color:#60a5fa; text-decoration:none; }
        li { margin-bottom:10px; }
      </style>
    </head>
    <body>
      <h1>Base Signal API</h1>
      <p>Real Base DEX signal API powered by GeckoTerminal data.</p>
      <div class="box">
        <h2>Endpoints</h2>
        <ul>
          <li><a href="/trend/base">/trend/base</a> — free real trending pools</li>
          <li><a href="/trend/new">/trend/new</a> — free newest Base pools</li>
          <li><a href="/trend/momentum">/trend/momentum</a> — free scored momentum signals</li>
          <li><a href="/trend/report">/trend/report</a> — x402 paid report</li>
        </ul>
      </div>
    </body>
  </html>
  `);
});

async function gt(path) {
  const res = await axios.get(`${GT}${path}`, {
    timeout: 12000,
    headers: { accept: "application/json" }
  });

  return res.data;
}

function buildIncludedMap(included = []) {
  const map = new Map();

  for (const item of included) {
    map.set(item.id, {
      id: item.id,
      type: item.type,
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
    const volume6h = Number(a.volume_usd?.h6 || 0);
    const volume24h = Number(a.volume_usd?.h24 || 0);

    const buys1h = Number(a.transactions?.h1?.buys || 0);
    const sells1h = Number(a.transactions?.h1?.sells || 0);
    const buys24h = Number(a.transactions?.h24?.buys || 0);
    const sells24h = Number(a.transactions?.h24?.sells || 0);

    const txns1h = buys1h + sells1h;
    const txns24h = buys24h + sells24h;

    const liquidityUsd = Number(a.reserve_in_usd || 0);

    const priceChange1h = Number(a.price_change_percentage?.h1 || 0);
    const priceChange24h = Number(a.price_change_percentage?.h24 || 0);

    const createdAt = a.pool_created_at
      ? new Date(a.pool_created_at).getTime()
      : 0;

    const ageMinutes = createdAt
      ? Math.max(0, Math.round((Date.now() - createdAt) / 60000))
      : null;

    const momentumScore =
      volume1h * 0.4 +
      volume6h * 0.2 +
      txns1h * 30 +
      buys1h * 20 +
      liquidityUsd * 0.03 +
      priceChange1h * 500;

    return {
      poolAddress: a.address,
      poolName: a.name,
      baseToken: baseToken?.name || null,
      baseSymbol: baseToken?.symbol || null,
      quoteToken: quoteToken?.name || null,
      quoteSymbol: quoteToken?.symbol || null,
      dex: dex?.name || null,
      priceUsd: a.base_token_price_usd || null,
      liquidityUsd: Math.round(liquidityUsd),
      volume1h: Math.round(volume1h),
      volume6h: Math.round(volume6h),
      volume24h: Math.round(volume24h),
      txns1h,
      txns24h,
      buys1h,
      sells1h,
      buys24h,
      sells24h,
      priceChange1h,
      priceChange24h,
      ageMinutes,
      poolCreatedAt: a.pool_created_at,
      geckoUrl: `https://www.geckoterminal.com/base/pools/${a.address}`,
      score: Math.round(momentumScore)
    };
  });
}

function cleanSignals(pools) {
  return pools
    .filter((p) => p.baseSymbol)
    .filter((p) => p.liquidityUsd >= 1000)
    .filter((p) => p.volume24h >= 1000)
    .filter((p) => p.txns24h >= 5);
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
      type: "real trending pools",
      count: pools.length,
      pools,
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({
      error: "failed to fetch GeckoTerminal trending pools",
      detail: err.response?.data || err.message
    });
  }
});

app.get("/trend/new", async (req, res) => {
  try {
    const payload = await gt(
      "/networks/base/new_pools?include=base_token,quote_token,dex"
    );

    const pools = normalizePools(payload)
      .filter((p) => p.baseSymbol)
      .filter((p) => p.ageMinutes !== null)
      .sort((a, b) => a.ageMinutes - b.ageMinutes)
      .slice(0, 20);

    res.json({
      source: "GeckoTerminal",
      network: "base",
      type: "newest pools",
      count: pools.length,
      pools,
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({
      error: "failed to fetch GeckoTerminal new pools",
      detail: err.response?.data || err.message
    });
  }
});

app.get("/trend/momentum", async (req, res) => {
  try {
    const [trendingPayload, topPayload, newPayload] = await Promise.all([
      gt("/networks/base/trending_pools?include=base_token,quote_token,dex"),
      gt("/networks/base/pools?include=base_token,quote_token,dex"),
      gt("/networks/base/new_pools?include=base_token,quote_token,dex")
    ]);

    const merged = [
      ...normalizePools(trendingPayload),
      ...normalizePools(topPayload),
      ...normalizePools(newPayload)
    ];

    const unique = new Map();

    for (const p of merged) {
      if (!p.poolAddress) continue;

      const old = unique.get(p.poolAddress);

      if (!old || p.score > old.score) {
        unique.set(p.poolAddress, p);
      }
    }

    const signals = cleanSignals(Array.from(unique.values()))
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);

    res.json({
      source: "GeckoTerminal",
      network: "base",
      type: "momentum scored pools",
      scoring:
        "score uses 1h volume, 6h volume, 1h transactions, 1h buys, liquidity, and 1h price change",
      count: signals.length,
      signals,
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({
      error: "failed to generate momentum signals",
      detail: err.response?.data || err.message
    });
  }
});

app.get("/trend/report", async (req, res) => {
  try {
    const [trendingPayload, newPayload] = await Promise.all([
      gt("/networks/base/trending_pools?include=base_token,quote_token,dex"),
      gt("/networks/base/new_pools?include=base_token,quote_token,dex")
    ]);

    const trending = cleanSignals(normalizePools(trendingPayload))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    const fresh = normalizePools(newPayload)
      .filter((p) => p.baseSymbol)
      .filter((p) => p.ageMinutes !== null)
      .filter((p) => p.liquidityUsd >= 1000)
      .sort((a, b) => a.ageMinutes - b.ageMinutes)
      .slice(0, 10);

    res.json({
      source: "GeckoTerminal",
      network: "base",
      paid: true,
      report: {
        topMomentumSignals: trending.slice(0, 5).map((p) => ({
          symbol: p.baseSymbol,
          pool: p.poolName,
          dex: p.dex,
          liquidityUsd: p.liquidityUsd,
          volume1h: p.volume1h,
          volume24h: p.volume24h,
          txns1h: p.txns1h,
          priceChange1h: p.priceChange1h,
          score: p.score,
          url: p.geckoUrl
        })),
        freshPools: fresh.slice(0, 5).map((p) => ({
          symbol: p.baseSymbol,
          pool: p.poolName,
          ageMinutes: p.ageMinutes,
          liquidityUsd: p.liquidityUsd,
          volume24h: p.volume24h,
          txns24h: p.txns24h,
          url: p.geckoUrl
        })),
        riskNotes: [
          "not financial advice",
          "low liquidity pools can be highly volatile",
          "signals are based on public GeckoTerminal pool data"
        ]
      },
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({
      error: "failed to generate report",
      detail: err.response?.data || err.message
    });
  }
});

module.exports = app;
