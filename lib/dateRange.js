// Earliest and latest transactionDate across a trade list. The upstream
// dataset (see lib/trades.js) is a rolling window that shifts with every
// daily refresh, not a fixed historical archive — showing users the actual
// span it currently covers (see the dashboard header) makes that a visible
// fact instead of something they have to discover by scrolling.
export function getTradeDateRange(trades) {
  let from = null;
  let to = null;

  for (const trade of trades) {
    if (!trade.transactionDate) continue;
    if (!from || trade.transactionDate < from) from = trade.transactionDate;
    if (!to || trade.transactionDate > to) to = trade.transactionDate;
  }

  return { from, to };
}
