// Server-only data layer: fetches a static, pre-parsed STOCK Act dataset
// (Congress + executive-branch disclosures) from a public GitHub repo and
// returns a normalized list of congressional trades. Nothing in this file
// runs in the browser.

const DATA_URL =
  "https://raw.githubusercontent.com/kadoa-org/congress-trading-monitor/main/public/data/trades.json";

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
    party: raw.party || null,
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

export async function getLatestTrades({ fresh = false, revalidateSeconds = 3600 } = {}) {
  // The dataset is a static file updated upstream, not a paginated API, so
  // there's no per-request quota to worry about. Normal page loads use
  // Next.js's fetch cache (revalidated hourly by default); the Refresh
  // button passes fresh=true to bypass it with cache: "no-store" and pick up
  // upstream updates. revalidateSeconds lets a caller with a longer cache
  // window of its own (e.g. the leaderboard's daily revalidate) match this
  // fetch's cache to it — Next.js caps a route's effective revalidation at
  // the shortest revalidate found among its fetches, so a route-level
  // `export const revalidate` longer than this fetch's window is silently
  // overridden otherwise.
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
    const trades = data
      .filter((raw) => raw.branch === "congress")
      .map(normalizeTrade)
      .sort((a, b) => new Date(b.transactionDate) - new Date(a.transactionDate));

    return { trades, error: null };
  } catch (err) {
    return { trades: [], error: err.message };
  }
}
