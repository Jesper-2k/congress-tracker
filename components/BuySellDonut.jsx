"use client";

import { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useIsDarkMode } from "@/components/useIsDarkMode";

// Green is the dataviz skill's mode-invariant categorical slot 6; red is
// the same slot-8 red used for "sell" in MonthlyActivityChart, so the two
// charts agree on what red means. Validated as a pair (light-mode CVD sits
// in the 6-8 floor band, which is legal with secondary encoding — covered
// here by the direct-labeled legend below plus the surface-colored gap
// between segments, so identity never rests on hue alone).
const SPLIT_COLOR = {
  buy: { light: "#008300", dark: "#008300" },
  sell: { light: "#e34948", dark: "#e66767" },
};
const CARD_SURFACE = { light: "#ffffff", dark: "#171717" }; // matches bg-white / bg-neutral-900

export default function BuySellDonut({ trades, title }) {
  const isDark = useIsDarkMode();
  const mode = isDark ? "dark" : "light";

  const { buyCount, sellCount, total, buyPct, sellPct } = useMemo(() => {
    const buyCount = trades.filter((t) => t.type === "buy").length;
    const sellCount = trades.filter((t) => t.type === "sell").length;
    const total = buyCount + sellCount;
    return {
      buyCount,
      sellCount,
      total,
      buyPct: total ? Math.round((buyCount / total) * 100) : 0,
      sellPct: total ? Math.round((sellCount / total) * 100) : 0,
    };
  }, [trades]);

  const data = [
    { key: "buy", name: "Buy", value: buyCount },
    { key: "sell", name: "Sell", value: sellCount },
  ];

  return (
    <div className="mb-8 rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <h2 className="mb-3 text-sm font-medium text-neutral-900 dark:text-neutral-50">{title}</h2>

      {total === 0 ? (
        <div className="flex h-52 items-center justify-center text-sm text-neutral-500 dark:text-neutral-400">
          No data
        </div>
      ) : (
        <>
          <div className="relative">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="65%"
                  outerRadius="90%"
                  startAngle={90}
                  endAngle={-270}
                  stroke={CARD_SURFACE[mode]}
                  strokeWidth={2}
                >
                  {data.map((entry) => (
                    <Cell key={entry.key} fill={SPLIT_COLOR[entry.key][mode]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name) => [`${value} trades`, name]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
                {buyPct}%
              </span>
              <span className="text-xs text-neutral-500 dark:text-neutral-400">Buy</span>
            </div>
          </div>

          <div className="mt-3 flex justify-center gap-4 text-xs text-neutral-500 dark:text-neutral-400">
            <span className="flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: SPLIT_COLOR.buy[mode] }}
              />
              Buy ({buyPct}%)
            </span>
            <span className="flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: SPLIT_COLOR.sell[mode] }}
              />
              Sell ({sellPct}%)
            </span>
          </div>
        </>
      )}
    </div>
  );
}
