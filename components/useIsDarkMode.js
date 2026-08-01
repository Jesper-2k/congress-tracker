"use client";

import { useSyncExternalStore } from "react";

// This app has no JS-visible theme state — dark mode is purely
// `prefers-color-scheme` via Tailwind's `dark:` variant. That's fine for
// className-based styling, but chart libraries like Recharts set colors as
// SVG `fill`/`stroke` attributes, which Tailwind classes can't reach. Chart
// components that need a validated color for each mode (see
// components/MonthlyActivityChart.jsx, BuySellDonut.jsx) read the OS
// preference directly instead of guessing one fixed hex for both modes.
//
// useSyncExternalStore (rather than useState+useEffect) is the React-
// recommended way to subscribe to an external browser API like matchMedia —
// getServerSnapshot returns `false` so server and first client render
// agree (no hydration mismatch), then it updates on mount/change.
function subscribe(callback) {
  const mql = window.matchMedia("(prefers-color-scheme: dark)");
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

function getSnapshot() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function getServerSnapshot() {
  return false;
}

export function useIsDarkMode() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
