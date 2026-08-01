// Buckets trades into the trailing 12 calendar months (this month back
// through 11 months ago), counting buys/sells per month and flagging which
// type dominated. Shared by the main dashboard's activity chart (all
// trades) and each member profile's activity chart (that member's trades)
// — see components/MonthlyActivityChart.jsx.

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function getMonthlyActivity(trades, referenceDate = new Date()) {
  const refYear = referenceDate.getUTCFullYear();
  const refMonth = referenceDate.getUTCMonth();

  const buckets = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(Date.UTC(refYear, refMonth - i, 1));
    buckets.push({
      key: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`,
      month: MONTH_LABELS[d.getUTCMonth()],
      year: d.getUTCFullYear(),
      count: 0,
      buyCount: 0,
      sellCount: 0,
    });
  }

  const bucketByKey = new Map(buckets.map((b) => [b.key, b]));

  for (const trade of trades) {
    if (!trade.transactionDate) continue;
    const bucket = bucketByKey.get(trade.transactionDate.slice(0, 7));
    if (!bucket) continue;
    bucket.count += 1;
    if (trade.type === "buy") bucket.buyCount += 1;
    else if (trade.type === "sell") bucket.sellCount += 1;
  }

  return buckets.map((b) => ({
    ...b,
    dominant: b.buyCount === b.sellCount ? "tie" : b.buyCount > b.sellCount ? "buy" : "sell",
  }));
}
