// Pure computation for the "mirror this member's trades" simulator (see
// components/PortfolioSimulator.jsx and the API route that calls this,
// app/api/member/[filerId]/simulate/route.js). Given a starting amount and
// already-fetched price history (lib/yahooFinance.js) for a member's most
// heavily-traded tickers plus SPY, this allocates the starting amount
// proportionally across the member's disclosed BUY trades and tracks two
// entry-timing scenarios:
//
// - "transaction": as if you could buy the instant the member did (best
//   case, unrealistic — the trade isn't public yet at that point).
// - "disclosure": as if you bought the day the trade became public via the
//   STOCK Act filing (realistic — what a retail investor could actually do).
//
// Sells aren't modeled as exits: a disclosed sell has a $ range but no
// share count, so there's no way to know how much of a range-estimated
// position it actually closes. This is a buy-and-hold mirror of disclosed
// purchases, not a full round-trip replay — noted in the simulator's
// on-page disclaimer.
//
// Any trade whose ticker isn't in `priceHistories` (because it fell outside
// the top-N cap on API calls, or because Yahoo Finance couldn't price it)
// is excluded from both the simulated portfolio and the SPY benchmark
// equally — its allocation sits out as idle cash in both totals — so the
// two stay directly, fairly comparable regardless of what could be priced.

import { closeOnOrBefore, latestClose } from "@/lib/yahooFinance";

export const MAX_TICKERS = 25;

// Ranks a member's disclosed BUY tickers by total estimated volume and
// returns the top MAX_TICKERS symbols — the set worth spending a Yahoo
// Finance call on. Volume is computed over ALL buy trades (not yet capped),
// so a ticker's rank reflects the member's true overall activity.
export function selectTopTickers(buyTrades, midpoints) {
  const volumeByTicker = new Map();
  for (const trade of buyTrades) {
    const midpoint = midpoints[trade.amount];
    if (midpoint === undefined) continue;
    volumeByTicker.set(trade.ticker, (volumeByTicker.get(trade.ticker) || 0) + midpoint);
  }
  return [...volumeByTicker.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_TICKERS)
    .map(([ticker]) => ticker);
}

// Returns a function that looks up "close on or before date" with an
// internal pointer that only moves forward — correct and O(historyLength)
// total, as long as it's called with non-decreasing dates (true for the
// chart-series loop below, which walks the date axis in order).
function buildForwardLookup(history) {
  if (!history) return () => null;
  let i = 0;
  let lastClose = null;
  return (date) => {
    while (i < history.dates.length && history.dates[i] <= date) {
      lastClose = history.closes[i];
      i++;
    }
    return lastClose;
  };
}

function buildScenario(totalValue, spyTotalValue, startingAmountUSD) {
  if (!startingAmountUSD) return null;
  const returnPct = ((totalValue - startingAmountUSD) / startingAmountUSD) * 100;
  const spyReturnPct = ((spyTotalValue - startingAmountUSD) / startingAmountUSD) * 100;
  return {
    totalValue,
    returnPct,
    spyValue: spyTotalValue,
    spyReturnPct,
    outperformancePct: returnPct - spyReturnPct,
  };
}

export function runSimulation({ buyTrades, midpoints, priceHistories, spyHistory, startingAmountUSD }) {
  const totalVolume = buyTrades.reduce((sum, t) => sum + (midpoints[t.amount] || 0), 0);
  const spyCurrent = latestClose(spyHistory);

  const tradeLog = [];
  let txnTotal = 0;
  let discTotal = 0;
  let spyTxnTotal = 0;
  let spyDiscTotal = 0;
  let excludedCount = 0;

  for (const trade of buyTrades) {
    const midpoint = midpoints[trade.amount];
    if (midpoint === undefined || totalVolume === 0) continue;

    const allocation = startingAmountUSD * (midpoint / totalVolume);
    const history = priceHistories.get(trade.ticker);
    const currentPrice = history ? latestClose(history) : null;
    const txnEntry = history ? closeOnOrBefore(history, trade.transactionDate) : null;
    const discEntry = history ? closeOnOrBefore(history, trade.disclosureDate) : null;
    const spyTxnEntry = closeOnOrBefore(spyHistory, trade.transactionDate);
    const spyDiscEntry = closeOnOrBefore(spyHistory, trade.disclosureDate);

    const priced =
      currentPrice !== null &&
      txnEntry !== null &&
      discEntry !== null &&
      spyTxnEntry !== null &&
      spyDiscEntry !== null &&
      spyCurrent !== null;

    if (!priced) {
      excludedCount += 1;
      txnTotal += allocation;
      discTotal += allocation;
      spyTxnTotal += allocation;
      spyDiscTotal += allocation;
      tradeLog.push({
        transactionDate: trade.transactionDate,
        disclosureDate: trade.disclosureDate,
        ticker: trade.ticker,
        amountInvested: allocation,
        priced: false,
      });
      continue;
    }

    const txnShares = allocation / txnEntry;
    const discShares = allocation / discEntry;
    const txnValue = txnShares * currentPrice;
    const discValue = discShares * currentPrice;

    txnTotal += txnValue;
    discTotal += discValue;
    spyTxnTotal += (allocation / spyTxnEntry) * spyCurrent;
    spyDiscTotal += (allocation / spyDiscEntry) * spyCurrent;

    tradeLog.push({
      transactionDate: trade.transactionDate,
      disclosureDate: trade.disclosureDate,
      ticker: trade.ticker,
      amountInvested: allocation,
      priced: true,
      transactionScenario: {
        value: txnValue,
        returnPct: ((txnValue - allocation) / allocation) * 100,
      },
      disclosureScenario: {
        value: discValue,
        returnPct: ((discValue - allocation) / allocation) * 100,
      },
    });
  }

  // Chart series (disclosure/realistic scenario only — see
  // components/PortfolioSimulator.jsx): from the earliest priced trade's
  // disclosure date to today, using SPY's own trading-day calendar as the
  // date axis since we already have it from the SPY fetch. Trades that
  // couldn't be priced hold their allocation flat for the *entire* series
  // (never converting to shares) so the chart's final value always matches
  // the "disclosure" scenario card's totalValue exactly — same accounting
  // as the scenario totals above, just spread across the timeline.
  const chartLegs = buyTrades
    .filter((trade) => midpoints[trade.amount] !== undefined)
    .map((trade) => {
      const midpoint = midpoints[trade.amount];
      const allocation = startingAmountUSD * (midpoint / totalVolume);
      const history = priceHistories.get(trade.ticker);
      if (!history) {
        return { disclosureDate: trade.disclosureDate, allocation, priced: false };
      }

      const discEntry = closeOnOrBefore(history, trade.disclosureDate);
      const spyDiscEntry = closeOnOrBefore(spyHistory, trade.disclosureDate);
      return {
        disclosureDate: trade.disclosureDate,
        allocation,
        priced: true,
        shares: allocation / discEntry,
        spyShares: allocation / spyDiscEntry,
        tickerLookup: buildForwardLookup(history),
      };
    });

  let chartSeries = [];
  const pricedLegs = chartLegs.filter((leg) => leg.priced);
  if (spyHistory && pricedLegs.length > 0) {
    const startDate = pricedLegs.reduce(
      (min, leg) => (!min || leg.disclosureDate < min ? leg.disclosureDate : min),
      null
    );
    const axisDates = spyHistory.dates.filter((d) => d >= startDate);
    const spyLookup = buildForwardLookup(spyHistory);

    chartSeries = axisDates.map((date) => {
      const spyClose = spyLookup(date);
      let portfolioValue = 0;
      let spyValue = 0;

      for (const leg of chartLegs) {
        if (!leg.priced) {
          portfolioValue += leg.allocation;
          spyValue += leg.allocation;
          continue;
        }
        const invested = date >= leg.disclosureDate;
        const tickerClose = invested ? leg.tickerLookup(date) : null;
        portfolioValue += invested && tickerClose !== null ? leg.shares * tickerClose : leg.allocation;
        spyValue += invested && spyClose !== null ? leg.spyShares * spyClose : leg.allocation;
      }

      return { date, portfolio: portfolioValue, spy: spyValue };
    });
  }

  return {
    excludedCount,
    tradeLog,
    chartSeries,
    scenarios: {
      transaction: buildScenario(txnTotal, spyTxnTotal, startingAmountUSD),
      disclosure: buildScenario(discTotal, spyDiscTotal, startingAmountUSD),
    },
  };
}
