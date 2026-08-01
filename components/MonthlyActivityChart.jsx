"use client";

import { useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { getMonthlyActivity } from "@/lib/monthlyActivity";
import { useIsDarkMode } from "@/components/useIsDarkMode";

// Validated blue/red pair (dataviz skill's categorical slots 1 & 8, also
// its documented diverging pair) — passes CVD/contrast checks as a
// standalone two-color set for both modes. Tie-gray is the palette's
// mode-invariant "muted" token: a genuine neutral/undetermined state, not a
// third hue competing for categorical identity, so it's exempt from the
// categorical chroma-floor check that (correctly) flags gray as "not a hue."
const DOMINANT_COLOR = {
  buy: { light: "#2a78d6", dark: "#3987e5" },
  sell: { light: "#e34948", dark: "#e66767" },
  tie: { light: "#898781", dark: "#898781" },
};

const GRIDLINE = { light: "#e1e0d9", dark: "#2c2c2a" };
const AXIS_INK = "#898781"; // mode-invariant muted ink

function ActivityTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const { count, buyCount, sellCount } = payload[0].payload;
  return (
    <div className="rounded-md border border-neutral-200 bg-white px-3 py-2 text-xs shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div className="font-medium text-neutral-900 dark:text-neutral-100">{label}</div>
      <div className="mt-1 text-neutral-500 dark:text-neutral-400">{count} trades</div>
      <div className="text-neutral-500 dark:text-neutral-400">
        {buyCount} buys · {sellCount} sells
      </div>
    </div>
  );
}

// Reused by both the main dashboard (Chart 1, all trades) and each member
// profile page (Chart 2, that member's trades) — same shape, different
// input and title. Trailing 12-month bars, colored by whichever of
// buy/sell dominated that month.
export default function MonthlyActivityChart({ trades, title }) {
  const isDark = useIsDarkMode();
  const data = useMemo(() => getMonthlyActivity(trades), [trades]);
  const activeMonths = data.filter((m) => m.count > 0).length;
  const mode = isDark ? "dark" : "light";

  return (
    <div className="mb-8 rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <h2 className="mb-3 text-sm font-medium text-neutral-900 dark:text-neutral-50">{title}</h2>

      {activeMonths < 3 ? (
        <div className="flex h-52 items-center justify-center text-sm text-neutral-500 dark:text-neutral-400">
          No data
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data} barCategoryGap="20%">
              <CartesianGrid vertical={false} stroke={GRIDLINE[mode]} />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: AXIS_INK }}
                axisLine={{ stroke: GRIDLINE[mode] }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: AXIS_INK }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
                width={28}
              />
              <Tooltip content={<ActivityTooltip />} cursor={{ fill: GRIDLINE[mode], opacity: 0.6 }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={28}>
                {data.map((entry) => (
                  <Cell key={entry.key} fill={DOMINANT_COLOR[entry.dominant][mode]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          <div className="mt-2 flex justify-center gap-4 text-xs text-neutral-500 dark:text-neutral-400">
            <span className="flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: DOMINANT_COLOR.buy[mode] }}
              />
              Buy-heavy month
            </span>
            <span className="flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: DOMINANT_COLOR.sell[mode] }}
              />
              Sell-heavy month
            </span>
          </div>
        </>
      )}
    </div>
  );
}
