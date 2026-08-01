// Live current-price lookups for the Inferred Portfolio table on member
// profile pages. Yahoo Finance's chart endpoint is unofficial and
// undocumented — in this project's dev environment it returned 429 (Too
// Many Requests) on every attempt, regardless of host or headers, which
// points to a blanket IP-level block rather than a fixable request issue.
// It may work fine elsewhere, but the caller can't depend on that, so every
// lookup here degrades to `null` on any failure instead of breaking the
// page. The portfolio table shows "—" for prices it couldn't fetch.

const YAHOO_CHART_URL = "https://query1.finance.yahoo.com/v8/finance/chart";

const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export async function getCurrentPrice(ticker) {
  try {
    const url = `${YAHOO_CHART_URL}/${encodeURIComponent(ticker)}?interval=1d&range=5d`;
    const res = await fetch(url, {
      headers: { "User-Agent": BROWSER_USER_AGENT },
      next: { revalidate: 3600 },
    });

    if (!res.ok) return null;

    const data = await res.json();
    const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
    return typeof price === "number" ? price : null;
  } catch {
    return null;
  }
}

// Fetches prices for a list of tickers (deduped) and returns a Map keyed by
// ticker. Individual failures don't affect other tickers.
export async function getCurrentPrices(tickers) {
  const uniqueTickers = [...new Set(tickers)];
  const entries = await Promise.all(
    uniqueTickers.map(async (ticker) => [ticker, await getCurrentPrice(ticker)])
  );
  return new Map(entries);
}

// Full daily close-price history for the portfolio simulator (see
// lib/portfolioSimulator.js) — needs actual historical prices, not just the
// current quote. Returns { dates, closes } as parallel arrays (dates as
// "YYYY-MM-DD", ascending) or null on any failure. Cached for a day since
// simulator runs are user-triggered (a "Calculate" button, not automatic)
// but popular tickers get reused across many members' simulations.
export async function getPriceHistory(ticker) {
  try {
    const url = `${YAHOO_CHART_URL}/${encodeURIComponent(ticker)}?interval=1d&range=5y`;
    const res = await fetch(url, {
      headers: { "User-Agent": BROWSER_USER_AGENT },
      next: { revalidate: 86400 },
    });

    if (!res.ok) return null;

    const data = await res.json();
    const result = data?.chart?.result?.[0];
    const timestamps = result?.timestamp;
    const closes = result?.indicators?.quote?.[0]?.close;
    if (!Array.isArray(timestamps) || !Array.isArray(closes) || timestamps.length === 0) {
      return null;
    }

    const dates = [];
    const values = [];
    for (let i = 0; i < timestamps.length; i++) {
      // Yahoo pads non-trading days within the range with null closes.
      if (typeof closes[i] !== "number") continue;
      dates.push(new Date(timestamps[i] * 1000).toISOString().slice(0, 10));
      values.push(closes[i]);
    }
    if (dates.length === 0) return null;

    return { dates, closes: values };
  } catch {
    return null;
  }
}

// Fetches full histories for several tickers in parallel. Returns a Map
// keyed by ticker; a ticker whose fetch failed is simply absent from the
// map rather than mapped to null, so `map.get(ticker)` reads the same as
// "never fetched" — the simulator treats both as "exclude this trade."
export async function getPriceHistories(tickers) {
  const uniqueTickers = [...new Set(tickers)];
  const entries = await Promise.all(
    uniqueTickers.map(async (ticker) => [ticker, await getPriceHistory(ticker)])
  );
  return new Map(entries.filter(([, history]) => history !== null));
}

// The closing price on `targetDate`, or the most recent trading day before
// it (weekends/holidays aren't in the series). Null if targetDate is
// earlier than the history's first entry.
export function closeOnOrBefore(history, targetDate) {
  if (!history) return null;
  const { dates, closes } = history;
  let result = null;
  for (let i = 0; i < dates.length; i++) {
    if (dates[i] > targetDate) break;
    result = closes[i];
  }
  return result;
}

export function latestClose(history) {
  if (!history || history.closes.length === 0) return null;
  return history.closes[history.closes.length - 1];
}
