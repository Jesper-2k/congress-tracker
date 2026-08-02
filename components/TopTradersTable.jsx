"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import PartyBadge from "@/components/PartyBadge";
import ToggleGroup from "@/components/ToggleGroup";
import { formatMoney } from "@/lib/format";
import { buildTraderSummary } from "@/lib/traderSummary";

const SORT_OPTIONS = [
  { value: "tradeCount", label: "Most Trades" },
  { value: "estVolume", label: "Est. Volume" },
  { value: "lastTradeDate", label: "Most Recent" },
];

export default function TopTradersTable({ trades }) {
  const [sortBy, setSortBy] = useState("tradeCount");

  const rows = useMemo(() => {
    const summary = buildTraderSummary(trades);
    return summary.sort((a, b) => {
      if (sortBy === "lastTradeDate") {
        return (b.lastTradeDate || "").localeCompare(a.lastTradeDate || "");
      }
      return b[sortBy] - a[sortBy];
    });
  }, [trades, sortBy]);

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-white p-8 text-center text-sm text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
        No members match your current filters.
      </div>
    );
  }

  return (
    <>
      <div className="mb-3 flex justify-end">
        <ToggleGroup value={sortBy} onChange={setSortBy} options={SORT_OPTIONS} />
      </div>
      <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500 dark:bg-neutral-900 dark:text-neutral-400">
            <tr>
              <th className="px-4 py-3 font-medium">Member</th>
              <th className="px-4 py-3 font-medium">Chamber</th>
              <th className="px-4 py-3 font-medium">Trades</th>
              <th className="px-4 py-3 font-medium">Buy / Sell</th>
              <th className="px-4 py-3 font-medium">Est. Volume</th>
              <th className="px-4 py-3 font-medium">Last Trade</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {rows.map((row) => (
              <tr key={row.filerId} className="bg-white dark:bg-neutral-950">
                <td className="px-4 py-3 font-medium text-neutral-900 dark:text-neutral-100">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/member/${row.filerId}`}
                      className="hover:underline hover:text-neutral-950 dark:hover:text-white"
                    >
                      {row.name}
                    </Link>
                    <PartyBadge party={row.party} />
                  </div>
                </td>
                <td className="px-4 py-3 text-neutral-500 dark:text-neutral-400">{row.chamber}</td>
                <td className="px-4 py-3 text-neutral-500 dark:text-neutral-400">{row.tradeCount}</td>
                <td className="px-4 py-3 text-neutral-500 dark:text-neutral-400">
                  {row.buyCount} buy / {row.sellCount} sell
                </td>
                <td className="px-4 py-3 text-neutral-500 dark:text-neutral-400">
                  {formatMoney(row.estVolume)}
                </td>
                <td className="px-4 py-3 text-neutral-500 dark:text-neutral-400">
                  {row.lastTradeDate || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
