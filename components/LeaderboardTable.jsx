"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import PartyBadge from "@/components/PartyBadge";
import ToggleGroup from "@/components/ToggleGroup";

const TOP_N = 15;

function formatPercent(value) {
  if (value === null || value === undefined) return "—";
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

// `candidates` is the precomputed pool from lib/leaderboard.js — already
// eligibility-filtered, with calculateMemberReturn() run for all three
// periods server-side. Everything below (chamber/party/period filtering,
// ranking, capping to 15) is cheap client-side array work over that small
// dataset, so the filter bar responds instantly with no server round trip.
export default function LeaderboardTable({ candidates }) {
  const [chamberFilter, setChamberFilter] = useState("all");
  const [partyFilter, setPartyFilter] = useState("all");
  const [period, setPeriod] = useState("all");

  const rows = useMemo(() => {
    return candidates
      .filter((c) => chamberFilter === "all" || c.chamber === chamberFilter)
      .filter((c) => partyFilter === "all" || c.party === partyFilter)
      .map((c) => ({ ...c, stats: c.byPeriod[period] }))
      // A member can be eligible overall but have no trades (or no
      // rankable ones) within the selected period — exclude rather than
      // show an unranked row in a "top performers" list.
      .filter((c) => c.stats && c.stats.tradeCount > 0 && c.stats.vsSpyReturn !== null)
      .sort((a, b) => b.stats.vsSpyReturn - a.stats.vsSpyReturn)
      .slice(0, TOP_N);
  }, [candidates, chamberFilter, partyFilter, period]);

  return (
    <>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
        <ToggleGroup
          value={chamberFilter}
          onChange={setChamberFilter}
          options={[
            { value: "all", label: "All" },
            { value: "House", label: "House" },
            { value: "Senate", label: "Senate" },
          ]}
        />
        <ToggleGroup
          value={partyFilter}
          onChange={setPartyFilter}
          options={[
            { value: "all", label: "All" },
            { value: "D", label: "Democrat" },
            { value: "R", label: "Republican" },
          ]}
        />
        <ToggleGroup
          value={period}
          onChange={setPeriod}
          options={[
            { value: "1y", label: "1 Year" },
            { value: "2y", label: "2 Years" },
            { value: "all", label: "All Time" },
          ]}
        />
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-neutral-200 bg-white p-8 text-center text-sm text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
          No members match your current filters.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500 dark:bg-neutral-900 dark:text-neutral-400">
              <tr>
                <th className="px-4 py-3 font-medium">Rank</th>
                <th className="px-4 py-3 font-medium">Member</th>
                <th className="px-4 py-3 font-medium">Party</th>
                <th className="px-4 py-3 font-medium">Chamber</th>
                <th className="px-4 py-3 font-medium">Raw Return</th>
                <th className="px-4 py-3 font-medium">vs SPY</th>
                <th className="px-4 py-3 font-medium">Trades</th>
                <th className="px-4 py-3 font-medium">Top Ticker</th>
                <th className="px-4 py-3 font-medium">Last Trade</th>
                <th className="px-4 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {rows.map((row, index) => (
                <tr key={row.filerId} className="bg-white dark:bg-neutral-950">
                  <td className="px-4 py-3 text-neutral-500 dark:text-neutral-400">{index + 1}</td>
                  <td className="px-4 py-3 font-medium text-neutral-900 dark:text-neutral-100">
                    {row.name}
                  </td>
                  <td className="px-4 py-3">
                    <PartyBadge party={row.party} />
                  </td>
                  <td className="px-4 py-3 text-neutral-500 dark:text-neutral-400">{row.chamber}</td>
                  <td className="px-4 py-3 text-neutral-500 dark:text-neutral-400">
                    {formatPercent(row.stats.rawReturn)}
                  </td>
                  <td className="px-4 py-3 font-medium text-neutral-900 dark:text-neutral-100">
                    {formatPercent(row.stats.vsSpyReturn)}
                  </td>
                  <td className="px-4 py-3 text-neutral-500 dark:text-neutral-400">
                    {row.stats.tradeCount}
                  </td>
                  <td className="px-4 py-3 text-neutral-500 dark:text-neutral-400">
                    {row.stats.topTickers[0] || "—"}
                  </td>
                  <td className="px-4 py-3 text-neutral-500 dark:text-neutral-400">
                    {row.stats.lastTradeDate || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Link
                        href={`/member/${row.filerId}`}
                        className="inline-block rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
                      >
                        View profile
                      </Link>
                      <Link
                        href={`/member/${row.filerId}?simulate=true`}
                        className="inline-block rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
                      >
                        Simulate
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
