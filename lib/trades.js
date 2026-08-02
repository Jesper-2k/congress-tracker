// Server-only data layer: fetches a static, pre-parsed STOCK Act dataset
// (Congress + executive-branch disclosures) from a public GitHub repo and
// returns a normalized list of congressional trades. Nothing in this file
// runs in the browser.

const DATA_URL =
  "https://raw.githubusercontent.com/kadoa-org/congress-trading-monitor/main/public/data/trades.json";

// Manual corrections for filers the upstream dataset has no party for
// (raw.party is null for every one of their records, in both trades.json
// and filers.json — not something a per-trade fallback elsewhere in this
// file could recover). Verified externally, not derivable from the dataset.
const PARTY_OVERRIDES = {
  senate_alan_armstrong: "R",
  senate_a_mitchell: "R",
};

function normalizeType(rawType) {
  const value = (rawType || "").toLowerCase();
  if (value.includes("purchase")) return "buy";
  if (value.includes("sale")) return "sell";
  return "other";
}

function normalizeChamber(rawChamber) {
  if (rawChamber === "house") return "House";
  if (rawChamber === "senate") return "Senate";
  return rawChamber || "";
}

function normalizeTrade(raw) {
  return {
    id: raw.id,
    filerId: raw.filer_id || null,
    chamber: normalizeChamber(raw.chamber),
    memberName: raw.filer_name || "",
    party: raw.party || PARTY_OVERRIDES[raw.filer_id] || null,
    state: raw.state || null,
    office: raw.office || null,
    ticker: raw.ticker || null,
    assetDescription: raw.asset_name || "",
    type: normalizeType(raw.transaction_type),
    rawType: raw.transaction_type || "",
    amount: raw.amount_range_label || "",
    transactionDate: raw.transaction_date || "",
    disclosureDate: raw.filing_date || "",
    daysToFile: typeof raw.days_to_file === "number" ? raw.days_to_file : null,
    owner: raw.owner || "",
    link: raw.doc_url || "",
    // Per-trade return metrics from the upstream dataset: % return and excess
    // return vs. a benchmark, from the transaction date to the dataset's last
    // refresh. Used instead of live price fetches for return calculations
    // (see lib/simulator.js and lib/members.js) since re-deriving these from
    // a historical-price API for every trade doesn't scale to a leaderboard.
    retSince: typeof raw.ret_since === "number" ? raw.ret_since : null,
    excessSince: typeof raw.excess_since === "number" ? raw.excess_since : null,
  };
}

// The dataset is ~6MB, over the Next.js fetch data cache's 2MB per-entry
// limit — that cache silently fails to store it ("Failed to set Next.js
// data cache... items over 2MB can not be cached"), so routes that render
// dynamically per-request (/member/[name], both API routes — anything
// without page-level ISR) would otherwise re-fetch and re-parse the full
// dataset on every single request with zero caching benefit. This
// in-memory cache sits in front of the fetch to guarantee caching
// regardless of payload size or a route's static/dynamic classification.
let cache = { trades: null, fetchedAt: 0 };

export async function getLatestTrades({ fresh = false, revalidateSeconds = 3600 } = {}) {
  const now = Date.now();
  if (!fresh && cache.trades && now - cache.fetchedAt < revalidateSeconds * 1000) {
    // Copied so a caller mutating the array in place (e.g. an in-place
    // .sort()) can't corrupt the shared cache for every other request
    // served from this same warm window.
    return { trades: [...cache.trades], error: null };
  }

  // Normal page loads use Next.js's fetch cache too (revalidated hourly by
  // default) as a second layer — it still works for anything statically
  // generated (/, /leaderboard), where it saves the fetch even across
  // separate server processes/deploys, which the in-memory cache above
  // can't. The Refresh button passes fresh=true to bypass both caches with
  // cache: "no-store" and pick up upstream updates. revalidateSeconds lets
  // a caller with a longer cache window of its own (e.g. the leaderboard's
  // daily revalidate) match this fetch's cache to it — Next.js caps a
  // route's effective revalidation at the shortest revalidate found among
  // its fetches, so a route-level `export const revalidate` longer than
  // this fetch's window is silently overridden otherwise.
  const cacheOption = fresh ? { cache: "no-store" } : { next: { revalidate: revalidateSeconds } };

  try {
    const res = await fetch(DATA_URL, cacheOption);

    if (!res.ok) {
      throw new Error(`Trade data request failed (HTTP ${res.status})`);
    }

    const data = await res.json();
    if (!Array.isArray(data)) {
      throw new Error("Trade data response was not a list of trades");
    }

    // The dataset also includes executive-branch (OGE) filings; this app is
    // scoped to Congress, so only House/Senate member disclosures are kept.
    // Sorted by disclosure date, not transaction date: someone loading this
    // page is asking "what was just disclosed?" — i.e. what's new since I
    // last checked — not "when did the underlying trade happen?" A trade
    // can sit undisclosed for weeks (up to the STOCK Act's 45-day deadline,
    // sometimes longer in practice) before becoming public, so disclosure
    // date is the event that should surface first.
    const trades = data
      .filter((raw) => raw.branch === "congress")
      .map(normalizeTrade)
      .sort((a, b) => new Date(b.disclosureDate) - new Date(a.disclosureDate));

    cache = { trades, fetchedAt: now };
    return { trades: [...trades], error: null };
  } catch (err) {
    // A transient fetch failure shouldn't take down the whole app if we
    // already have (even stale) trade data cached — same reasoning as
    // getPriceHistory's stale-fallback in lib/yahooFinance.js. SetupNotice
    // is still shown when there's truly nothing cached yet (the very first
    // request, or a sustained outage since server start).
    if (cache.trades) return { trades: [...cache.trades], error: null };
    return { trades: [], error: err.message };
  }
}
