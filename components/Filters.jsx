import ToggleGroup from "@/components/ToggleGroup";

export default function Filters({
  search,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  chamberFilter,
  onChamberFilterChange,
  partyFilter,
  onPartyFilterChange,
  showUnknownTicker,
  onShowUnknownTickerChange,
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <input
        type="text"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search member or ticker…"
        className="w-full rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-50 sm:max-w-xs"
      />

      <div className="flex flex-wrap items-center gap-3">
        <ToggleGroup
          value={typeFilter}
          onChange={onTypeFilterChange}
          options={[
            { value: "all", label: "All Types" },
            { value: "buy", label: "Buy" },
            { value: "sell", label: "Sell" },
          ]}
        />
        <ToggleGroup
          value={chamberFilter}
          onChange={onChamberFilterChange}
          options={[
            { value: "all", label: "Both" },
            { value: "House", label: "House" },
            { value: "Senate", label: "Senate" },
          ]}
        />
        <ToggleGroup
          value={partyFilter}
          onChange={onPartyFilterChange}
          options={[
            { value: "all", label: "All" },
            { value: "D", label: "Democrat" },
            { value: "R", label: "Republican" },
          ]}
        />
        <label className="flex items-center gap-1.5 text-sm text-neutral-600 dark:text-neutral-300">
          <input
            type="checkbox"
            checked={showUnknownTicker}
            onChange={(e) => onShowUnknownTickerChange(e.target.checked)}
            className="h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-400 dark:border-neutral-700 dark:bg-neutral-900"
          />
          Show trades with unknown ticker
        </label>
      </div>
    </div>
  );
}
