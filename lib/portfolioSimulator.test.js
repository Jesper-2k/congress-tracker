import { describe, expect, test } from "vitest";
import { MAX_TICKERS, selectTopTickers, runSimulation } from "@/lib/portfolioSimulator";

const SMALL = "$1,001 - $15,000"; // 8000
const MEDIUM = "$15,001 - $50,000"; // 32500
const LARGE = "$50,001 - $100,000"; // 75000
const MIDPOINTS = { [SMALL]: 8000, [MEDIUM]: 32500, [LARGE]: 75000 };

function buyTrade(overrides) {
  return { ticker: "AAPL", amount: SMALL, transactionDate: "2024-01-01", ...overrides };
}

describe("selectTopTickers", () => {
  test("ranks tickers by total disclosed buy volume, descending", () => {
    const buyTrades = [
      buyTrade({ ticker: "SMALL_TICKER", amount: SMALL }),
      buyTrade({ ticker: "LARGE_TICKER", amount: LARGE }),
      buyTrade({ ticker: "MEDIUM_TICKER", amount: MEDIUM }),
    ];
    expect(selectTopTickers(buyTrades, MIDPOINTS)).toEqual([
      "LARGE_TICKER",
      "MEDIUM_TICKER",
      "SMALL_TICKER",
    ]);
  });

  test("sums volume across multiple trades in the same ticker", () => {
    const buyTrades = [
      buyTrade({ ticker: "AAPL", amount: SMALL }),
      buyTrade({ ticker: "AAPL", amount: SMALL }),
      buyTrade({ ticker: "MSFT", amount: MEDIUM }),
    ];
    // AAPL: 8000 + 8000 = 16000, still less than MSFT's 32500
    expect(selectTopTickers(buyTrades, MIDPOINTS)).toEqual(["MSFT", "AAPL"]);
  });

  test("ignores trades with an unrecognized amount bracket", () => {
    const buyTrades = [buyTrade({ ticker: "AAPL", amount: "not a real bracket" })];
    expect(selectTopTickers(buyTrades, MIDPOINTS)).toEqual([]);
  });

  test("caps the result at MAX_TICKERS", () => {
    const buyTrades = Array.from({ length: MAX_TICKERS + 5 }, (_, i) =>
      buyTrade({ ticker: `T${i}`, amount: SMALL })
    );
    expect(selectTopTickers(buyTrades, MIDPOINTS)).toHaveLength(MAX_TICKERS);
  });
});

describe("runSimulation", () => {
  // AAPL: txn close 100, disclosure close 125, latest (current) close 150.
  const aaplHistory = { dates: ["2024-01-01", "2024-01-15", "2024-03-01"], closes: [100, 125, 150] };
  // MSFT: txn close 250, disclosure close 260, latest (current) close 400.
  const msftHistory = { dates: ["2024-02-01", "2024-02-20", "2024-03-01"], closes: [250, 260, 400] };
  // SPY benchmark, covering every date the two trades reference.
  const spyHistory = {
    dates: ["2024-01-01", "2024-01-15", "2024-02-01", "2024-02-20", "2024-03-01"],
    closes: [400, 410, 420, 430, 450],
  };

  const buyTrades = [
    { ticker: "AAPL", amount: SMALL, transactionDate: "2024-01-01", disclosureDate: "2024-01-15" },
    { ticker: "MSFT", amount: MEDIUM, transactionDate: "2024-02-01", disclosureDate: "2024-02-20" },
    // TSLA has no entry in priceHistories — it should be excluded from
    // share-value math but still counted (at face allocation) in both
    // totals, so the two stay comparable.
    { ticker: "TSLA", amount: LARGE, transactionDate: "2024-01-10", disclosureDate: "2024-01-25" },
  ];

  const priceHistories = new Map([
    ["AAPL", aaplHistory],
    ["MSFT", msftHistory],
  ]);

  // startingAmountUSD equals total disclosed volume (8000 + 32500 + 75000),
  // so each trade's allocation lands exactly on its own midpoint — keeps
  // the expected numbers below easy to follow.
  const startingAmountUSD = 8000 + 32500 + 75000;

  const result = runSimulation({
    buyTrades,
    midpoints: MIDPOINTS,
    priceHistories,
    spyHistory,
    startingAmountUSD,
  });

  test("excludes unpriced trades from share math but keeps their allocation in both totals", () => {
    expect(result.excludedCount).toBe(1);
    const tsla = result.tradeLog.find((row) => row.ticker === "TSLA");
    expect(tsla).toMatchObject({ priced: false, amountInvested: 75000 });
  });

  test("converts each priced trade's allocation into shares at the entry price, valued at the current price", () => {
    const aapl = result.tradeLog.find((row) => row.ticker === "AAPL");
    expect(aapl.priced).toBe(true);
    // 8000 / 100 (txn entry) * 150 (current) = 12000; return = +50%
    expect(aapl.transactionScenario.value).toBeCloseTo(12000, 5);
    expect(aapl.transactionScenario.returnPct).toBeCloseTo(50, 5);
    // 8000 / 125 (disclosure entry) * 150 (current) = 9600; return = +20%
    expect(aapl.disclosureScenario.value).toBeCloseTo(9600, 5);
    expect(aapl.disclosureScenario.returnPct).toBeCloseTo(20, 5);
  });

  test("aggregates scenario totals across all trades, including unpriced ones at face allocation", () => {
    // AAPL txn value 12000 + MSFT txn value (32500/250*400 = 52000) + TSLA's flat 75000
    expect(result.scenarios.transaction.totalValue).toBeCloseTo(12000 + 52000 + 75000, 5);
    // AAPL disc value 9600 + MSFT disc value (32500/260*400 = 50000) + TSLA's flat 75000
    expect(result.scenarios.disclosure.totalValue).toBeCloseTo(9600 + 50000 + 75000, 5);
  });

  test("computes the SPY benchmark leg per trade using SPY's own entry price at the same dates", () => {
    const spyTxn = 8000 / 400 * 450 + 32500 / 420 * 450 + 75000; // AAPL + MSFT + unpriced TSLA
    const spyDisc = 8000 / 410 * 450 + 32500 / 430 * 450 + 75000;
    expect(result.scenarios.transaction.spyValue).toBeCloseTo(spyTxn, 5);
    expect(result.scenarios.disclosure.spyValue).toBeCloseTo(spyDisc, 5);
  });

  test("outperformance is the simulated return minus the SPY return, for both scenarios", () => {
    for (const scenario of [result.scenarios.transaction, result.scenarios.disclosure]) {
      expect(scenario.outperformancePct).toBeCloseTo(scenario.returnPct - scenario.spyReturnPct, 5);
    }
  });

  test("the chart series' final point matches the disclosure scenario's totals exactly", () => {
    expect(result.chartSeries.length).toBeGreaterThan(0);
    const last = result.chartSeries[result.chartSeries.length - 1];
    expect(last.portfolio).toBeCloseTo(result.scenarios.disclosure.totalValue, 5);
    expect(last.spy).toBeCloseTo(result.scenarios.disclosure.spyValue, 5);
  });

  test("returns null scenarios instead of dividing by zero when there's no starting amount", () => {
    const zeroResult = runSimulation({
      buyTrades,
      midpoints: MIDPOINTS,
      priceHistories,
      spyHistory,
      startingAmountUSD: 0,
    });
    expect(zeroResult.scenarios.transaction).toBeNull();
    expect(zeroResult.scenarios.disclosure).toBeNull();
  });
});
