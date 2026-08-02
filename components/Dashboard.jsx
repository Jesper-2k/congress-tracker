"use client";

import { useMemo, useState } from "react";
import SummaryStats from "@/components/SummaryStats";
import Filters from "@/components/Filters";
import TradeTable from "@/components/TradeTable";
import TopTradersTable from "@/components/TopTradersTable";
import ToggleGroup from "@/components/ToggleGroup";
import RefreshButton from "@/components/RefreshButton";
import MonthlyActivityChart from "@/components/MonthlyActivityChart";

const VIEW_OPTIONS = [
  { value: "traders", label: "Top Traders" },
  { value: "trades", label: "All Trades" },
];

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
  const [partyFilter, setPartyFilter] = useState("all");
  const [showUnknownTicker, setShowUnknownTicker] = useState(false);
  // Defaults to the grouped-by-member view — a flat feed of every disclosed
  // trade isn't an actionable landing view once the dataset covers dozens
  // of members. "All Trades" is still available for ticker-focused
  // browsing; a specific member's full trade history is one click away on
  // their profile page (linked from every row in either view).
  const [view, setView] = useState("traders");

  // Re-fetches the full trades dataset bypassing the cache (see
  // getLatestTrades({ fresh: true }) in lib/trades.js) and merges in any
  // trades not already in allTrades, surfacing new disclosures since the
  // last load without discarding client-side state like search/filters.
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

        // Matches the disclosure-date sort in lib/trades.js's getLatestTrades()
        // — re-sorting by transactionDate here would silently flip the order
        // back on every refresh.
        setAllTrades(
          Array.from(merged.values()).sort(
            (a, b) => new Date(b.disclosureDate) - new Date(a.disclosureDate)
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
  // Deliberately excludes the unknown-ticker toggle so hiddenUnknownTickerCount
  // below can report how many trades the toggle is hiding relative to the
  // user's other active filters, not a static whole-dataset count.
  const visibleBeforeTickerFilter = useMemo(() => {
    const query = search.trim().toLowerCase();

    return allTrades.filter((trade) => {
      if (typeFilter !== "all" && trade.type !== typeFilter) return false;
      if (chamberFilter !== "all" && trade.chamber !== chamberFilter) return false;
      if (partyFilter !== "all" && trade.party !== partyFilter) return false;

      if (query) {
        const matchesMember = trade.memberName.toLowerCase().includes(query);
        const matchesTicker = trade.ticker?.toLowerCase().includes(query);
        if (!matchesMember && !matchesTicker) return false;
      }

      return true;
    });
  }, [allTrades, search, typeFilter, chamberFilter, partyFilter]);

  const hiddenUnknownTickerCount = useMemo(
    () => visibleBeforeTickerFilter.filter((trade) => !trade.ticker).length,
    [visibleBeforeTickerFilter]
  );

  // Trades with no disclosed ticker (cash/bond/option positions the dataset
  // couldn't resolve to a symbol) are hidden by default — a raw "$1,001 -
  // $15,000, ticker unknown" row isn't actionable for most visitors, and
  // they're one checkbox away for anyone who wants them.
  const filteredTrades = useMemo(() => {
    if (showUnknownTicker) return visibleBeforeTickerFilter;
    return visibleBeforeTickerFilter.filter((trade) => Boolean(trade.ticker));
  }, [visibleBeforeTickerFilter, showUnknownTicker]);

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
        partyFilter={partyFilter}
        onPartyFilterChange={setPartyFilter}
        showUnknownTicker={showUnknownTicker}
        onShowUnknownTickerChange={setShowUnknownTicker}
      />
      {!showUnknownTicker && hiddenUnknownTickerCount > 0 && (
        <p className="-mt-3 mb-4 text-xs text-neutral-400 dark:text-neutral-500">
          {hiddenUnknownTickerCount} trade{hiddenUnknownTickerCount === 1 ? "" : "s"} with
          unidentified tickers hidden.
        </p>
      )}

      <div className="mb-3">
        <ToggleGroup value={view} onChange={setView} options={VIEW_OPTIONS} />
      </div>

      {view === "traders" ? (
        <TopTradersTable trades={filteredTrades} />
      ) : (
        <TradeTable trades={filteredTrades} />
      )}
      <RefreshButton
        onClick={handleRefresh}
        loading={loading}
        error={refreshError}
        statusMessage={statusMessage}
      />
    </>
  );
}
