import { describe, expect, test } from "vitest";
import {
  AMOUNT_MIDPOINTS,
  getMemberProfile,
  getMemberStats,
  getPositiveTickers,
  getInferredPortfolio,
} from "@/lib/members";

const SMALL = "$1,001 - $15,000"; // midpoint 8000
const MEDIUM = "$15,001 - $50,000"; // midpoint 32500

function trade(overrides) {
  return {
    filerId: "house_test_member",
    memberName: "Test Member",
    party: "D",
    chamber: "House",
    state: "CA",
    office: "Representative",
    ticker: "AAPL",
    type: "buy",
    amount: SMALL,
    transactionDate: "2024-01-01",
    disclosureDate: "2024-01-15",
    retSince: null,
    excessSince: null,
    ...overrides,
  };
}

describe("getMemberProfile", () => {
  test("takes identity fields from the first trade and the latest disclosure date across all of them", () => {
    const trades = [
      trade({ disclosureDate: "2024-01-15" }),
      trade({ disclosureDate: "2024-03-01" }),
      trade({ disclosureDate: "2024-02-01" }),
    ];
    const profile = getMemberProfile(trades);
    expect(profile).toMatchObject({
      filerId: "house_test_member",
      name: "Test Member",
      party: "D",
      chamber: "House",
      state: "CA",
      office: "Representative",
      mostRecentDisclosureDate: "2024-03-01",
    });
  });
});

describe("getMemberStats", () => {
  test("computes buy/sell counts and rounded percentages", () => {
    const trades = [
      trade({ type: "buy", ticker: "AAPL" }),
      trade({ type: "buy", ticker: "AAPL" }),
      trade({ type: "buy", ticker: "MSFT" }),
      trade({ type: "sell", ticker: "MSFT" }),
    ];
    const stats = getMemberStats(trades);
    expect(stats.totalTrades).toBe(4);
    expect(stats.buyCount).toBe(3);
    expect(stats.sellCount).toBe(1);
    expect(stats.buyPct).toBe(75);
    expect(stats.sellPct).toBe(25);
  });

  test("returns null percentages when there are no buy/sell trades", () => {
    const stats = getMemberStats([trade({ type: "other" })]);
    expect(stats.buyPct).toBeNull();
    expect(stats.sellPct).toBeNull();
  });

  test("ranks mostTradedTicker by appearances across all trade types", () => {
    const trades = [
      trade({ ticker: "AAPL", type: "buy" }),
      trade({ ticker: "AAPL", type: "sell" }),
      trade({ ticker: "AAPL", type: "other" }),
      trade({ ticker: "MSFT", type: "buy" }),
    ];
    expect(getMemberStats(trades).mostTradedTicker).toEqual({ ticker: "AAPL", count: 3 });
  });

  test("picks the highest retSince among the top 5 most-traded tickers, ignoring a rarer ticker with a higher return", () => {
    const trades = [
      // AAPL: 3 mentions (top ticker), best retSince 20
      trade({ ticker: "AAPL", retSince: 20 }),
      trade({ ticker: "AAPL", retSince: 5 }),
      trade({ ticker: "AAPL", retSince: -10 }),
      // MSFT: 2 mentions, retSince 8
      trade({ ticker: "MSFT", retSince: 8 }),
      trade({ ticker: "MSFT", retSince: 8 }),
    ];
    expect(getMemberStats(trades).bestPerformer).toEqual({ ticker: "AAPL", retSince: 20 });
  });
});

describe("getPositiveTickers / getInferredPortfolio", () => {
  test("only tickers with a positive net position are included, ranked by est. position", () => {
    const trades = [
      // AAPL: two buys, net position 16,000 (below MEDIUM's single 32,500)
      trade({ ticker: "AAPL", type: "buy", amount: SMALL, transactionDate: "2023-06-01", retSince: 50 }),
      trade({ ticker: "AAPL", type: "buy", amount: SMALL, transactionDate: "2023-01-01", retSince: 10 }),
      // MSFT: bought then fully sold — net position 0, should be excluded entirely
      trade({ ticker: "MSFT", type: "buy", amount: SMALL, transactionDate: "2023-01-01", retSince: 5 }),
      trade({ ticker: "MSFT", type: "sell", amount: SMALL, transactionDate: "2023-06-01" }),
      // GOOG: single larger buy, net position 32,500 — should rank above AAPL
      trade({ ticker: "GOOG", type: "buy", amount: MEDIUM, transactionDate: "2023-01-01", retSince: null }),
      // Ignored inputs: no ticker, an "other" type, and an unrecognized amount bracket
      trade({ ticker: null, type: "buy" }),
      trade({ ticker: "TSLA", type: "other" }),
      trade({ ticker: "NFLX", type: "buy", amount: "$0 - $1,000" }),
    ];

    const positiveTickers = getPositiveTickers(trades);
    expect(positiveTickers.sort()).toEqual(["AAPL", "GOOG"]);

    const priceMap = new Map([["AAPL", 150]]);
    const portfolio = getInferredPortfolio(trades, priceMap);

    expect(portfolio.map((r) => r.ticker)).toEqual(["GOOG", "AAPL"]); // sorted by estPosition desc

    const aapl = portfolio.find((r) => r.ticker === "AAPL");
    expect(aapl.estPosition).toBe(16000);
    // firstBuyRetSince picks the earliest-dated buy's retSince (10, from
    // 2023-01-01), even though it appears second in the trades array —
    // proves the comparison is by date, not by array order.
    expect(aapl.returnSinceFirstBuy).toBe(10);
    // estValue grows each buy's midpoint by that trade's own retSince:
    // 8000*1.5 (the 2023-06-01 buy) + 8000*1.10 (the 2023-01-01 buy)
    expect(aapl.estValue).toBeCloseTo(20800, 5);
    expect(aapl.currentPrice).toBe(150);

    const goog = portfolio.find((r) => r.ticker === "GOOG");
    expect(goog.estPosition).toBe(32500);
    expect(goog.returnSinceFirstBuy).toBeNull();
    expect(goog.currentPrice).toBeNull(); // absent from priceMap
  });

  test("AMOUNT_MIDPOINTS covers every bracket used by these fixtures", () => {
    expect(AMOUNT_MIDPOINTS[SMALL]).toBe(8000);
    expect(AMOUNT_MIDPOINTS[MEDIUM]).toBe(32500);
  });
});
