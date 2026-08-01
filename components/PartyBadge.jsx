const STYLES = {
  D: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  R: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  I: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
};

const LABELS = {
  D: "Democrat",
  R: "Republican",
  I: "Independent",
};

export default function PartyBadge({ party }) {
  if (!party) return null;

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        STYLES[party] || "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
      }`}
    >
      {LABELS[party] || party}
    </span>
  );
}
