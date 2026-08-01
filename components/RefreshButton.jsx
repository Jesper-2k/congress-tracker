export default function RefreshButton({ onClick, loading, error, statusMessage }) {
  return (
    <div className="mt-4 flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={onClick}
        disabled={loading}
        className="rounded-md border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
      >
        {loading ? "Refreshing…" : "Refresh"}
      </button>
      {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
      {!error && statusMessage && (
        <p className="text-sm text-neutral-500 dark:text-neutral-400">{statusMessage}</p>
      )}
    </div>
  );
}
