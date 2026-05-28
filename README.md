# Base Signal API

Real-time Base ecosystem signal API powered by GeckoTerminal market data and protected with x402 payments.

## Features

- Real Base trending pools
- New Base pool discovery
- Momentum scoring engine
- Liquidity and transaction filtering
- Paid x402 market reports
- AI agent compatible JSON responses

## Live Endpoints

### Free Endpoints

```txt
/trend/base
/trend/new
/trend/momentum
```

### Paid x402 Endpoint

```txt
/trend/report
```

Protected using x402 payment middleware.

## Example Use Cases

- AI trading agents
- Base ecosystem scanners
- Momentum discovery
- Early pool monitoring
- Narrative tracking
- Autonomous market analysis

## Powered By

- GeckoTerminal API
- x402 payment protocol
- Vercel serverless infrastructure

## Example Response

```json
{
  "symbol": "VIRTUAL",
  "liquidityUsd": 597593,
  "volume1h": 495532,
  "txns1h": 1427,
  "score": 1028056
}
```

## Live Deployment

```txt
https://base-trend-api.vercel.app
```
