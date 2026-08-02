"use client";

import { useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { formatMoney, formatPercent } from "@/lib/format";

const DEFAULT_AMOUNT = 10000;

function ScenarioCard({ title, description, scenario, currency }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <h3 className="font-semibold text-neutral-900 dark:text-neutral-50">{title}</h3>
      <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{description}</p>

      {!scenario ? (
        <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">
          Not enough priced trades to simulate.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          <div>
            <div className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              Simulated Portfolio
            </div>
            <div className="mt-0.5 text-xl font-semibold text-neutral-900 dark:text-neutral-50">
              {formatMoney(scenario.totalValue, currency)}
            </div>
            <div className="text-sm text-neutral-500 dark:text-neutral-400">
              {formatPercent(scenario.returnPct)}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              SPY
            </div>
            <div className="mt-0.5 text-xl font-semibold text-neutral-900 dark:text-neutral-50">
              {formatMoney(scenario.spyValue, currency)}
            </div>
            <div className="text-sm text-neutral-500 dark:text-neutral-400">
              {formatPercent(scenario.spyReturnPct)}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              Outperformance
            </div>
            <div
              className={`mt-0.5 text-xl font-semibold ${
                scenario.outperformancePct >= 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400"
              }`}
            >
              {formatPercent(scenario.outperformancePct)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// The member's trades are already known server-side by filerId, so the
// client only ever sends the two things it controls: starting amount and
// currency. Everything else (which tickers, price history, SPY) is looked
// up by the API route.
export default function PortfolioSimulator({ filerId }) {
  const [amount, setAmount] = useState(DEFAULT_AMOUNT);
  const [currency, setCurrency] = useState("EUR");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  async function handleCalculate() {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(
        `/api/member/${filerId}/simulate?amount=${encodeURIComponent(amount)}&currency=${currency}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Simulation failed.");
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section id="simulator" className="mb-8 scroll-mt-6">
      <h2 className="mb-1 text-lg font-semibold text-neutral-900 dark:text-neutral-50">
        Portfolio Simulator
      </h2>
      <p className="mb-4 text-sm text-neutral-500 dark:text-neutral-400">
        Mirror this member&apos;s disclosed trades proportionally with a custom starting amount.
      </p>

      <div className="mb-6 flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            Starting Amount
          </label>
          <input
            type="number"
            min="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-40 rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-sm text-neutral-900 focus:border-neutral-400 focus:outline-none dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-50"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            Currency
          </label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-sm text-neutral-900 focus:border-neutral-400 focus:outline-none dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-50"
          >
            <option value="EUR">EUR</option>
            <option value="USD">USD</option>
          </select>
        </div>
        <button
          type="button"
          onClick={handleCalculate}
          disabled={loading || !amount || Number(amount) <= 0}
          className="rounded-md bg-neutral-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-neutral-50 dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          {loading ? "Calculating…" : "Calculate"}
        </button>
        <span className="text-xs text-neutral-400 dark:text-neutral-500">
          Approximate FX rate for USD/EUR.
        </span>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
          {error}
        </div>
      )}

      {result && (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ScenarioCard
              title="Best Case — Transaction Date"
              description="As if you'd bought the instant the member did. Unrealistic — the trade wasn't public yet."
              scenario={result.scenarios.transaction}
              currency={result.currency}
            />
            <ScenarioCard
              title="Realistic — Disclosure Date"
              description="As if you'd bought the day the trade was publicly disclosed."
              scenario={result.scenarios.disclosure}
              currency={result.currency}
            />
          </div>

          {result.chartSeries.length > 0 && (
            <div className="mb-6 rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
              <h3 className="mb-3 text-sm font-medium text-neutral-900 dark:text-neutral-50">
                Simulated Portfolio vs SPY — Realistic Scenario
              </h3>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={result.chartSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-neutral-200 dark:text-neutral-800" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} minTickGap={40} />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => formatMoney(v, result.currency)}
                    width={80}
                  />
                  <Tooltip formatter={(value) => formatMoney(value, result.currency)} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="portfolio"
                    name="Simulated Portfolio"
                    stroke="#0ea5e9"
                    dot={false}
                    strokeWidth={2}
                  />
                  <Line type="monotone" dataKey="spy" name="SPY" stroke="#a3a3a3" dot={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {result.excludedCount > 0 && (
            <p className="mb-4 text-xs text-neutral-400 dark:text-neutral-500">
              {result.excludedCount} of {result.tradeLog.length} disclosed buy trades couldn&apos;t be
              simulated (outside this member&apos;s top {result.tickersConsidered} most-traded tickers,
              or no Yahoo Finance price data available) and are held as uninvested cash in the totals
              above.
            </p>
          )}

          <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500 dark:bg-neutral-900 dark:text-neutral-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Ticker</th>
                  <th className="px-4 py-3 font-medium">Amount Invested</th>
                  <th className="px-4 py-3 font-medium">Value (Txn Date)</th>
                  <th className="px-4 py-3 font-medium">Return (Txn Date)</th>
                  <th className="px-4 py-3 font-medium">Value (Disclosure)</th>
                  <th className="px-4 py-3 font-medium">Return (Disclosure)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {result.tradeLog.map((row, i) => (
                  <tr key={i} className="bg-white dark:bg-neutral-950">
                    <td className="px-4 py-3 text-neutral-500 dark:text-neutral-400">
                      {row.transactionDate}
                    </td>
                    <td className="px-4 py-3 font-medium text-neutral-900 dark:text-neutral-100">
                      {row.ticker}
                    </td>
                    <td className="px-4 py-3 text-neutral-500 dark:text-neutral-400">
                      {formatMoney(row.amountInvested, result.currency)}
                    </td>
                    {row.priced ? (
                      <>
                        <td className="px-4 py-3 text-neutral-500 dark:text-neutral-400">
                          {formatMoney(row.transactionScenario.value, result.currency)}
                        </td>
                        <td className="px-4 py-3 text-neutral-500 dark:text-neutral-400">
                          {formatPercent(row.transactionScenario.returnPct)}
                        </td>
                        <td className="px-4 py-3 text-neutral-500 dark:text-neutral-400">
                          {formatMoney(row.disclosureScenario.value, result.currency)}
                        </td>
                        <td className="px-4 py-3 text-neutral-500 dark:text-neutral-400">
                          {formatPercent(row.disclosureScenario.returnPct)}
                        </td>
                      </>
                    ) : (
                      <td className="px-4 py-3 text-neutral-400 dark:text-neutral-500" colSpan={4}>
                        Price data unavailable
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <p className="mt-4 text-xs text-neutral-400 dark:text-neutral-500">
        Estimated from disclosed transaction ranges using midpoint values. Disclosure delay of up
        to 45 days means realistic returns may differ from best case. Past performance does not
        guarantee future results. Not investment advice.
      </p>
    </section>
  );
}
