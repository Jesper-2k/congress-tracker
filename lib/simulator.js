// Reusable member-performance metric, shared by the member profile page and
// (per plan) a future leaderboard page that will call this once per member
// across every tracked member.
//
// Yahoo Finance's chart endpoint is unreliable enough server-side (see
// lib/yahooFinance.js — it 429'd on every attempt in dev) that computing
// returns by re-fetching historical prices for every trade isn't viable at
// leaderboard scale. Instead this reads ret_since / excess_since, which the
// trades dataset already provides per trade (% return, and % excess return
// vs. a benchmark, from that trade's transaction date to the dataset's last
// refresh) — no network calls, so it's cheap enough to run across every
// member's full trade history.
//
// rawReturn and vsSpyReturn are equal-weighted averages of each trade's
// ret_since / excess_since (not dollar-weighted, since disclosed amounts are
// ranges, not exact figures). Trades without a ret_since (e.g. no ticker,
// or the dataset couldn't price it) are excluded rather than treated as 0%.

export function calculateMemberReturn(trades) {
  const withReturn = trades.filter((t) => t.retSince !== null);
  const withExcess = trades.filter((t) => t.excessSince !== null);

  const rawReturn = withReturn.length
    ? withReturn.reduce((sum, t) => sum + t.retSince, 0) / withReturn.length
    : null;

  const vsSpyReturn = withExcess.length
    ? withExcess.reduce((sum, t) => sum + t.excessSince, 0) / withExcess.length
    : null;

  const tickerCounts = new Map();
  for (const t of trades) {
    if (!t.ticker) continue;
    tickerCounts.set(t.ticker, (tickerCounts.get(t.ticker) || 0) + 1);
  }
  const topTickers = [...tickerCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([ticker]) => ticker);

  const lastTradeDate = trades.reduce((latest, t) => {
    if (!t.transactionDate) return latest;
    return !latest || t.transactionDate > latest ? t.transactionDate : latest;
  }, null);

  return {
    rawReturn,
    vsSpyReturn,
    topTickers,
    tradeCount: trades.length,
    lastTradeDate,
  };
}
