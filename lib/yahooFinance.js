// Live current-price lookups for the Inferred Portfolio table on member
// profile pages, via Yahoo Finance's unofficial /v7/finance/quote endpoint
// (batches multiple symbols per request, unlike the /v8/finance/chart
// endpoint below). Every lookup degrades to `null` on failure instead of
// breaking the page — the portfolio table shows "—" for prices it
// couldn't fetch.

const YAHOO_CHART_URL = "https://query1.finance.yahoo.com/v8/finance/chart";
const YAHOO_QUOTE_URL = "https://query1.finance.yahoo.com/v7/finance/quote";

const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const PRICE_CACHE_TTL_MS = 5 * 60 * 1000;
const PRICE_BATCH_SIZE = 10;
const PRICE_BATCH_DELAY_MS = 200;

// ticker -> { price: number | null, expiresAt: number }
const priceCache = new Map();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// One /v7/finance/quote request for up to PRICE_BATCH_SIZE symbols. A
// request-level failure (network error, non-OK response) degrades every
// ticker in the batch to null rather than throwing; a ticker missing from
// an otherwise-successful response (e.g. delisted symbol) does the same
// individually, so one bad ticker can't take down the rest of the batch.
async function fetchQuoteBatch(tickers) {
  const results = new Map();

  try {
    const url = `${YAHOO_QUOTE_URL}?symbols=${tickers.map(encodeURIComponent).join(",")}`;
    const res = await fetch(url, {
      headers: { "User-Agent": BROWSER_USER_AGENT },
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      for (const ticker of tickers) results.set(ticker, null);
      return results;
    }

    const data = await res.json();
    const quotes = data?.quoteResponse?.result ?? [];
    const bySymbol = new Map(quotes.map((quote) => [quote.symbol, quote]));

    for (const ticker of tickers) {
      const price = bySymbol.get(ticker)?.regularMarketPrice;
      results.set(ticker, typeof price === "number" ? price : null);
    }
  } catch {
    for (const ticker of tickers) results.set(ticker, null);
  }

  return results;
}

// Fetches current prices for a list of tickers (deduped), returning a Map
// keyed by ticker. Cached results younger than PRICE_CACHE_TTL_MS are
// served without hitting Yahoo; only the remaining tickers are fetched, in
// batches of PRICE_BATCH_SIZE with a delay between batches to stay under
// rate limits. Individual ticker failures don't affect other tickers.
export async function getCurrentPrices(tickers) {
  const uniqueTickers = [...new Set(tickers)];
  const now = Date.now();
  const result = new Map();
  const toFetch = [];

  for (const ticker of uniqueTickers) {
    const cached = priceCache.get(ticker);
    if (cached && cached.expiresAt > now) {
      result.set(ticker, cached.price);
    } else {
      toFetch.push(ticker);
    }
  }

  for (let i = 0; i < toFetch.length; i += PRICE_BATCH_SIZE) {
    if (i > 0) await sleep(PRICE_BATCH_DELAY_MS);

    const batch = toFetch.slice(i, i + PRICE_BATCH_SIZE);
    const batchResults = await fetchQuoteBatch(batch);

    for (const [ticker, price] of batchResults) {
      result.set(ticker, price);
      priceCache.set(ticker, { price, expiresAt: now + PRICE_CACHE_TTL_MS });
    }
  }

  return result;
}

const HISTORY_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

// ticker -> { history: { dates, closes }, expiresAt: number }
const historyCache = new Map();

// Every return path below hands out a copy of the cached history rather
// than the cached object itself, so a caller mutating dates/closes in
// place can't corrupt what every other request sees for the rest of the
// cache window.
function cloneHistory(history) {
  return history ? { dates: [...history.dates], closes: [...history.closes] } : null;
}

// Full daily close-price history for the portfolio simulator (see
// lib/portfolioSimulator.js) — needs actual historical prices, not just the
// current quote. Returns { dates, closes } as parallel arrays (dates as
// "YYYY-MM-DD", ascending) or null if nothing has ever been fetched
// successfully for this ticker.
//
// Cached in-memory for a day, since simulator runs are user-triggered (a
// "Calculate" button, not automatic) but popular tickers get reused across
// many members' simulations — this guarantees that reuse regardless of
// Next's fetch-cache heuristics on this route (the simulate API reads
// searchParams before fetching, which can affect fetch caching eligibility).
//
// On failure, falls back to the last successful fetch for that ticker even
// past its TTL, rather than null: a stale-but-real history lets the
// simulator keep working for previously-priced tickers (including SPY, the
// benchmark leg every simulation needs) through a transient Yahoo outage or
// rate-limit block, instead of one bad request taking the whole feature
// down for everyone.
export async function getPriceHistory(ticker) {
  const now = Date.now();
  const cached = historyCache.get(ticker);
  if (cached && cached.expiresAt > now) return cloneHistory(cached.history);

  try {
    const url = `${YAHOO_CHART_URL}/${encodeURIComponent(ticker)}?interval=1d&range=5y`;
    const res = await fetch(url, {
      headers: { "User-Agent": BROWSER_USER_AGENT },
      next: { revalidate: 86400 },
    });

    if (!res.ok) throw new Error(`Yahoo chart request failed (HTTP ${res.status})`);

    const data = await res.json();
    const result = data?.chart?.result?.[0];
    const timestamps = result?.timestamp;
    const closes = result?.indicators?.quote?.[0]?.close;
    if (!Array.isArray(timestamps) || !Array.isArray(closes) || timestamps.length === 0) {
      throw new Error("Yahoo chart response had no price data");
    }

    const dates = [];
    const values = [];
    for (let i = 0; i < timestamps.length; i++) {
      // Yahoo pads non-trading days within the range with null closes.
      if (typeof closes[i] !== "number") continue;
      dates.push(new Date(timestamps[i] * 1000).toISOString().slice(0, 10));
      values.push(closes[i]);
    }
    if (dates.length === 0) throw new Error("Yahoo chart response had no valid closes");

    const history = { dates, closes: values };
    historyCache.set(ticker, { history, expiresAt: now + HISTORY_CACHE_TTL_MS });
    return cloneHistory(history);
  } catch {
    return cached ? cloneHistory(cached.history) : null;
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
