# Congress Tracker

A Next.js app for tracking stock trades disclosed by U.S. House and Senate members under the [STOCK Act](https://en.wikipedia.org/wiki/STOCK_Act).

## Features

- **Dashboard** (`/`) — searchable, filterable feed of disclosed trades (by type, chamber, and party), with summary stats and a monthly activity chart. A Refresh button re-fetches the latest disclosures on demand.
- **Member profiles** (`/member/[filerId]`) — a member's trade history, stat cards (buy/sell split, most-traded ticker, best-performing trade), and an **Inferred Portfolio**: estimated current holdings and value, built from disclosed transaction ranges plus a live price lookup.
- **Leaderboard** (`/leaderboard`) — members ranked by return vs. the S&P 500 on their disclosed trades, filterable by chamber, party, and time period.
- **Portfolio Simulator** (on each member profile) — mirrors a member's disclosed buys with a custom starting amount, comparing two entry-timing scenarios (as if you'd bought the instant the trade happened vs. the day it was actually disclosed) against an SPY benchmark.

All estimates are derived from disclosed transaction *ranges* (e.g. "$1,001–$15,000"), not exact share counts or prices — see the disclaimers on each page. Not investment advice.

## Data sources

- **Trade disclosures**: a static, pre-parsed dataset of STOCK Act filings from [kadoa-org/congress-trading-monitor](https://github.com/kadoa-org/congress-trading-monitor), fetched server-side (see `lib/trades.js`). No API key required.
- **Live prices**: Yahoo Finance's unofficial `/v7/finance/quote` (current prices) and `/v8/finance/chart` (historical prices, for the simulator) endpoints (see `lib/yahooFinance.js`). These are undocumented and occasionally rate-limit or block requests entirely depending on the network they're called from; the app degrades gracefully (showing "—" or falling back to the last successfully cached price) rather than failing the page when that happens.

## Architecture

- `lib/` — server-only data fetching (`trades.js`, `yahooFinance.js`) and pure computation (`members.js`, `leaderboard.js`, `simulator.js`, `portfolioSimulator.js`, `monthlyActivity.js`, `currency.js`, `format.js`). The pure functions have no I/O, so they're covered by unit tests independent of any live data source.
- `components/` — presentation. Client Components (`"use client"`) handle interactivity (filters, the simulator form); everything else is a Server Component.
- `app/` — routes and API endpoints (`app/api/trades`, `app/api/member/[filerId]/simulate`).

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Scripts

| Command         | Description                                  |
| --------------- | --------------------------------------------- |
| `npm run dev`   | Start the dev server                          |
| `npm run build` | Production build                              |
| `npm start`     | Serve the production build                    |
| `npm run lint`  | Lint with ESLint                              |
| `npm test`      | Run the unit test suite (Vitest, `lib/*.test.js`) |

No environment variables are required — both data sources above are public and unauthenticated.
