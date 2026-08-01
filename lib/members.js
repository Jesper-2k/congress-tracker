// Member-profile aggregation: header info, the four investor-view stat
// cards, and the inferred-holdings estimate. Everything here is a pure
// function over an already-normalized trade list (see lib/trades.js) — no
// I/O — so it's cheap to call on every profile-page request. The one live
// dependency (current price) is fetched separately in lib/yahooFinance.js
// and passed in as a Map, keeping this file testable without network calls.
//
// These are specific to the member profile page. calculateMemberReturn() in
// lib/simulator.js is the function meant for reuse elsewhere (leaderboard).

// Dollar midpoints for each disclosed amount range, used to estimate a
// dollar-denominated net position per ticker (buys minus sells). The two
// largest brackets aren't in the STOCK Act's standard range list the app
// was built around, so their midpoints are computed the same way as the
// others (arithmetic midpoint of the bracket).
export const AMOUNT_MIDPOINTS = {
  "$1,001 - $15,000": 8000,
  "$15,001 - $50,000": 32500,
  "$50,001 - $100,000": 75000,
  "$100,001 - $250,000": 175000,
  "$250,001 - $500,000": 375000,
  "$500,001 - $1,000,000": 750000,
  "$1,000,001 - $5,000,000": 3000000,
  "$5,000,001 - $25,000,000": 15000000,
};

function latestDate(trades, field) {
  return trades.reduce((latest, t) => {
    const value = t[field];
    if (!value) return latest;
    return !latest || value > latest ? value : latest;
  }, null);
}

// Assumes `trades` are all for the same member (already filtered by filerId).
export function getMemberProfile(trades) {
  const [first] = trades;
  return {
    filerId: first.filerId,
    name: first.memberName,
    party: first.party,
    chamber: first.chamber,
    state: first.state,
    office: first.office,
    mostRecentDisclosureDate: latestDate(trades, "disclosureDate"),
  };
}

export function getMemberStats(trades) {
  const totalTrades = trades.length;
  const buyCount = trades.filter((t) => t.type === "buy").length;
  const sellCount = trades.filter((t) => t.type === "sell").length;
  const buySellTotal = buyCount + sellCount;

  const tickerCounts = new Map();
  for (const t of trades) {
    if (!t.ticker) continue;
    tickerCounts.set(t.ticker, (tickerCounts.get(t.ticker) || 0) + 1);
  }
  const rankedTickers = [...tickerCounts.entries()].sort((a, b) => b[1] - a[1]);
  const mostTradedTicker = rankedTickers[0]
    ? { ticker: rankedTickers[0][0], count: rankedTickers[0][1] }
    : null;

  // "Best performing trade" among the top 5 most-traded tickers: the single
  // trade with the highest ret_since (return from its transaction date to
  // the dataset's last refresh).
  const topFiveTickers = new Set(rankedTickers.slice(0, 5).map(([ticker]) => ticker));
  let bestPerformer = null;
  for (const t of trades) {
    if (!t.ticker || t.retSince === null || !topFiveTickers.has(t.ticker)) continue;
    if (!bestPerformer || t.retSince > bestPerformer.retSince) {
      bestPerformer = { ticker: t.ticker, retSince: t.retSince };
    }
  }

  return {
    totalTrades,
    buyCount,
    sellCount,
    buyPct: buySellTotal ? Math.round((buyCount / buySellTotal) * 100) : null,
    sellPct: buySellTotal ? Math.round((sellCount / buySellTotal) * 100) : null,
    mostTradedTicker,
    bestPerformer,
  };
}

// Estimates a net dollar position per ticker (sum of buy midpoints minus
// sell midpoints), keeping only tickers with a positive net position.
// Est. value grows each buy's midpoint by that specific trade's own
// ret_since (so an old buy that's since doubled contributes more than a
// recent one at the same dollar size) and treats sells as removing their
// midpoint at face value. This is an estimate built entirely from disclosed
// ranges and per-trade returns — there's no way to recover actual share
// counts from a "$1,001-$15,000" bracket, so it can't be reconciled exactly
// against `currentPrice`, which is just a live, independent quote.
export function getInferredPortfolio(trades, priceMap) {
  const byTicker = new Map();

  for (const t of trades) {
    if (!t.ticker || (t.type !== "buy" && t.type !== "sell")) continue;
    const midpoint = AMOUNT_MIDPOINTS[t.amount];
    if (midpoint === undefined) continue;

    if (!byTicker.has(t.ticker)) {
      byTicker.set(t.ticker, { position: 0, estValue: 0, firstBuyDate: null, firstBuyRetSince: null });
    }
    const entry = byTicker.get(t.ticker);

    if (t.type === "buy") {
      entry.position += midpoint;
      entry.estValue += t.retSince !== null ? midpoint * (1 + t.retSince / 100) : midpoint;
      if (!entry.firstBuyDate || t.transactionDate < entry.firstBuyDate) {
        entry.firstBuyDate = t.transactionDate;
        entry.firstBuyRetSince = t.retSince;
      }
    } else {
      entry.position -= midpoint;
      entry.estValue -= midpoint;
    }
  }

  const rows = [];
  for (const [ticker, entry] of byTicker) {
    if (entry.position <= 0) continue;
    rows.push({
      ticker,
      estPosition: entry.position,
      currentPrice: priceMap?.get(ticker) ?? null,
      estValue: entry.estValue,
      returnSinceFirstBuy: entry.firstBuyRetSince,
    });
  }

  return rows.sort((a, b) => b.estPosition - a.estPosition);
}
