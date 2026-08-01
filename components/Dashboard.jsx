"use client";

import { useMemo, useState } from "react";
import SummaryStats from "@/components/SummaryStats";
import Filters from "@/components/Filters";
import TradeTable from "@/components/TradeTable";
import RefreshButton from "@/components/RefreshButton";
import MonthlyActivityChart from "@/components/MonthlyActivityChart";

// "use client" makes this a Client Component: it runs in the browser and can
// use React state/hooks. Filtering already-loaded data doesn't need another
// network request, so this stays entirely client-side — fast and simple.
export default function Dashboard({ trades: initialTrades }) {
  const [allTrades, setAllTrades] = useState(initialTrades);
  const [loading, setLoading] = useState(false);
  const [refreshError, setRefreshError] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [chamberFilter, setChamberFilter] = useState("all");

  // FMP's free plan only exposes the latest 25 trades per chamber (no
  // pagination into history), so "load more" isn't possible here — instead
  // this re-fetches that same latest-25 window and merges it into what we
  // already have, surfacing any trades disclosed since the last load.
  async function handleRefresh() {
    setLoading(true);
    setRefreshError(null);
    setStatusMessage(null);

    try {
      const res = await fetch("/api/trades");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to refresh trades.");
      }

      const existingIds = new Set(allTrades.map((trade) => trade.id));
      const newTrades = data.trades.filter((trade) => !existingIds.has(trade.id));

      if (newTrades.length > 0) {
        const merged = new Map(allTrades.map((trade) => [trade.id, trade]));
        for (const trade of data.trades) merged.set(trade.id, trade);

        setAllTrades(
          Array.from(merged.values()).sort(
            (a, b) => new Date(b.transactionDate) - new Date(a.transactionDate)
          )
        );
      }

      setStatusMessage(
        newTrades.length > 0
          ? `${newTrades.length} new trade${newTrades.length === 1 ? "" : "s"} loaded.`
          : "You're up to date — no new trades."
      );
    } catch (err) {
      setRefreshError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // useMemo re-runs this filtering logic only when the trade list or the
  // filter values change, instead of on every render (e.g. unrelated re-renders).
  const filteredTrades = useMemo(() => {
    const query = search.trim().toLowerCase();

    return allTrades.filter((trade) => {
      if (typeFilter !== "all" && trade.type !== typeFilter) return false;
      if (chamberFilter !== "all" && trade.chamber !== chamberFilter) return false;

      if (query) {
        const matchesMember = trade.memberName.toLowerCase().includes(query);
        const matchesTicker = trade.ticker?.toLowerCase().includes(query);
        if (!matchesMember && !matchesTicker) return false;
      }

      return true;
    });
  }, [allTrades, search, typeFilter, chamberFilter]);

  return (
    <>
      <SummaryStats trades={filteredTrades} />
      <MonthlyActivityChart trades={filteredTrades} title="Trading activity — last 12 months" />
      <Filters
        search={search}
        onSearchChange={setSearch}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        chamberFilter={chamberFilter}
        onChamberFilterChange={setChamberFilter}
      />
      <TradeTable trades={filteredTrades} />
      <RefreshButton
        onClick={handleRefresh}
        loading={loading}
        error={refreshError}
        statusMessage={statusMessage}
      />
    </>
  );
}
