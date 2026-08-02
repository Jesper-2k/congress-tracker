import StatTile from "@/components/StatTile";
import { formatPercent } from "@/lib/format";

export default function MemberStatCards({ stats }) {
  const buySellRatio =
    stats.buyPct === null ? "—" : `${stats.buyPct}% buys · ${stats.sellPct}% sells`;

  const mostTraded = stats.mostTradedTicker
    ? `${stats.mostTradedTicker.ticker} (${stats.mostTradedTicker.count})`
    : "—";

  const bestPerformer = stats.bestPerformer
    ? `${stats.bestPerformer.ticker} ${formatPercent(stats.bestPerformer.retSince)}`
    : "—";

  return (
    <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
      <StatTile label="Total Trades" value={stats.totalTrades} />
      <StatTile label="Buy/Sell Ratio" value={buySellRatio} />
      <StatTile label="Most Traded Ticker" value={mostTraded} />
      <StatTile
        label="Best Performing Trade"
        value={bestPerformer}
        hint="Among top 5 most-traded tickers"
      />
    </div>
  );
}
