import Link from "next/link";
import TypeBadge from "@/components/TypeBadge";

export default function TradeTable({ trades }) {
  if (trades.length === 0) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-white p-8 text-center text-sm text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
        No trades match your current filters.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500 dark:bg-neutral-900 dark:text-neutral-400">
          <tr>
            <th className="px-4 py-3 font-medium">Member</th>
            <th className="px-4 py-3 font-medium">Chamber</th>
            <th className="px-4 py-3 font-medium">Ticker</th>
            <th className="px-4 py-3 font-medium">Type</th>
            <th className="px-4 py-3 font-medium">Amount</th>
            <th className="px-4 py-3 font-medium">Date</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {trades.map((trade) => (
            <tr key={trade.id} className="bg-white dark:bg-neutral-950">
              <td className="px-4 py-3 text-neutral-900 dark:text-neutral-100">
                {trade.filerId ? (
                  <Link
                    href={`/member/${trade.filerId}`}
                    className="hover:underline hover:text-neutral-950 dark:hover:text-white"
                  >
                    {trade.memberName}
                  </Link>
                ) : (
                  trade.memberName
                )}
              </td>
              <td className="px-4 py-3 text-neutral-500 dark:text-neutral-400">
                {trade.chamber}
              </td>
              <td className="px-4 py-3 font-medium text-neutral-900 dark:text-neutral-100">
                {trade.ticker || "—"}
              </td>
              <td className="px-4 py-3">
                <TypeBadge type={trade.type} />
              </td>
              <td className="px-4 py-3 text-neutral-500 dark:text-neutral-400">
                {trade.amount}
              </td>
              <td className="px-4 py-3 text-neutral-500 dark:text-neutral-400">
                {trade.transactionDate}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
