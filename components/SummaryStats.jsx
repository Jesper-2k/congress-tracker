import StatTile from "@/components/StatTile";

// Computes the "most traded ticker" by counting how many times each ticker
// appears, then picking the highest count. This runs on every render, but
// the caller (Dashboard) wraps it in useMemo so it only recomputes when the
// filtered trade list actually changes.
function mostTradedTicker(trades) {
  const counts = new Map();
  for (const trade of trades) {
    if (!trade.ticker) continue;
    counts.set(trade.ticker, (counts.get(trade.ticker) || 0) + 1);
  }

  let topTicker = null;
  let topCount = 0;
  for (const [ticker, count] of counts) {
    if (count > topCount) {
      topTicker = ticker;
      topCount = count;
    }
  }

  return topTicker ? `${topTicker} (${topCount})` : "—";
}

export default function SummaryStats({ trades }) {
  const buyCount = trades.filter((t) => t.type === "buy").length;
  const sellCount = trades.filter((t) => t.type === "sell").length;

  return (
    <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
      <StatTile label="Total Trades" value={trades.length} />
      <StatTile label="Buys" value={buyCount} />
      <StatTile label="Sells" value={sellCount} />
      <StatTile label="Most Traded Ticker" value={mostTradedTicker(trades)} />
    </div>
  );
}
