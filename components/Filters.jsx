import ToggleGroup from "@/components/ToggleGroup";

export default function Filters({
  search,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  chamberFilter,
  onChamberFilterChange,
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
      </div>
    </div>
  );
}
