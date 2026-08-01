const STYLES = {
  buy: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  sell: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300",
  other: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
};

const LABELS = {
  buy: "Buy",
  sell: "Sell",
  other: "Other",
};

export default function TypeBadge({ type }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STYLES[type] || STYLES.other}`}
    >
      {LABELS[type] || "Other"}
    </span>
  );
}
