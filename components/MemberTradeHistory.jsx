"use client";

import { useMemo, useState } from "react";
import TypeBadge from "@/components/TypeBadge";
import ToggleGroup from "@/components/ToggleGroup";

export default function MemberTradeHistory({ trades }) {
  const [typeFilter, setTypeFilter] = useState("all");
  const [tickerSearch, setTickerSearch] = useState("");

  const filteredTrades = useMemo(() => {
    const query = tickerSearch.trim().toLowerCase();

    return trades.filter((trade) => {
      if (typeFilter !== "all" && trade.type !== typeFilter) return false;
      if (query && !trade.ticker?.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [trades, typeFilter, tickerSearch]);

  return (
    <section className="mb-8">
      <h2 className="mb-3 text-lg font-semibold text-neutral-900 dark:text-neutral-50">
        Trade History
      </h2>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="text"
          value={tickerSearch}
          onChange={(e) => setTickerSearch(e.target.value)}
          placeholder="Search ticker…"
          className="w-full rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-50 sm:max-w-xs"
        />
        <ToggleGroup
          value={typeFilter}
          onChange={setTypeFilter}
          options={[
            { value: "all", label: "All" },
            { value: "buy", label: "Buys" },
            { value: "sell", label: "Sells" },
          ]}
        />
      </div>

      {filteredTrades.length === 0 ? (
        <div className="rounded-lg border border-neutral-200 bg-white p-8 text-center text-sm text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
          No trades match your current filters.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500 dark:bg-neutral-900 dark:text-neutral-400">
              <tr>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Ticker</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Days to Disclose</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {filteredTrades.map((trade) => (
                <tr key={trade.id} className="bg-white dark:bg-neutral-950">
                  <td className="px-4 py-3 text-neutral-500 dark:text-neutral-400">
                    {trade.transactionDate}
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
                    {trade.daysToFile ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
