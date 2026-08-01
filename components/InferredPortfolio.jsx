function formatMoney(value) {
  if (value === null || Number.isNaN(value)) return "—";
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function formatPercent(value) {
  if (value === null) return "—";
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

export default function InferredPortfolio({ rows }) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-lg font-semibold text-neutral-900 dark:text-neutral-50">
        Inferred Portfolio
      </h2>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-neutral-200 bg-white p-8 text-center text-sm text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
          No positive estimated positions from disclosed trades.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500 dark:bg-neutral-900 dark:text-neutral-400">
              <tr>
                <th className="px-4 py-3 font-medium">Ticker</th>
                <th className="px-4 py-3 font-medium">Est. Position ($)</th>
                <th className="px-4 py-3 font-medium">Current Price</th>
                <th className="px-4 py-3 font-medium">Est. Value</th>
                <th className="px-4 py-3 font-medium">Return Since First Buy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {rows.map((row) => (
                <tr key={row.ticker} className="bg-white dark:bg-neutral-950">
                  <td className="px-4 py-3 font-medium text-neutral-900 dark:text-neutral-100">
                    {row.ticker}
                  </td>
                  <td className="px-4 py-3 text-neutral-500 dark:text-neutral-400">
                    {formatMoney(row.estPosition)}
                  </td>
                  <td className="px-4 py-3 text-neutral-500 dark:text-neutral-400">
                    {row.currentPrice !== null ? `$${row.currentPrice.toFixed(2)}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-neutral-500 dark:text-neutral-400">
                    {formatMoney(row.estValue)}
                  </td>
                  <td className="px-4 py-3 text-neutral-500 dark:text-neutral-400">
                    {formatPercent(row.returnSinceFirstBuy)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-2 text-xs text-neutral-400 dark:text-neutral-500">
        Estimated from disclosed transaction ranges.
      </p>
    </section>
  );
}
