// Shared formatters for the money and percent-return values shown across
// the dashboard, member profile, leaderboard, and simulator tables. Both
// treat null/undefined/NaN as "nothing to show" (rendered as "—") rather
// than letting a missing value reach toFixed()/toLocaleString() and throw,
// since callers throughout lib/ use null (not 0) for "couldn't be computed".

export function formatMoney(value, currency = "USD") {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return value.toLocaleString("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  });
}

export function formatPercent(value) {
  if (value === null || value === undefined) return "—";
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}
