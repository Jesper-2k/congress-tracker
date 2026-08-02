import { describe, expect, test } from "vitest";
import { calculateMemberReturn } from "@/lib/simulator";

function trade(overrides) {
  return {
    ticker: "AAPL",
    retSince: null,
    excessSince: null,
    transactionDate: "2024-01-01",
    ...overrides,
  };
}

describe("calculateMemberReturn", () => {
  test("averages retSince/excessSince equal-weighted across trades that have them", () => {
    const trades = [
      trade({ retSince: 10, excessSince: 4 }),
      trade({ retSince: 20, excessSince: -2 }),
    ];
    const result = calculateMemberReturn(trades);
    expect(result.rawReturn).toBe(15);
    expect(result.vsSpyReturn).toBe(1);
  });

  test("excludes trades without a retSince/excessSince from the average instead of treating them as 0", () => {
    const trades = [
      trade({ retSince: 10, excessSince: 10 }),
      trade({ retSince: null, excessSince: null }),
    ];
    const result = calculateMemberReturn(trades);
    expect(result.rawReturn).toBe(10);
    expect(result.vsSpyReturn).toBe(10);
  });

  test("returns null averages when no trade has a return", () => {
    const result = calculateMemberReturn([trade({ retSince: null, excessSince: null })]);
    expect(result.rawReturn).toBeNull();
    expect(result.vsSpyReturn).toBeNull();
  });

  test("ranks topTickers by trade count, capped at 3", () => {
    const trades = [
      trade({ ticker: "AAPL" }),
      trade({ ticker: "AAPL" }),
      trade({ ticker: "AAPL" }),
      trade({ ticker: "MSFT" }),
      trade({ ticker: "MSFT" }),
      trade({ ticker: "GOOG" }),
      trade({ ticker: "TSLA" }),
    ];
    const result = calculateMemberReturn(trades);
    expect(result.topTickers).toEqual(["AAPL", "MSFT", "GOOG"]);
  });

  test("finds the latest transactionDate across trades", () => {
    const trades = [
      trade({ transactionDate: "2023-05-01" }),
      trade({ transactionDate: "2024-02-15" }),
      trade({ transactionDate: "2023-11-30" }),
    ];
    expect(calculateMemberReturn(trades).lastTradeDate).toBe("2024-02-15");
  });

  test("reports the raw trade count regardless of how many are priced", () => {
    const trades = [trade({ retSince: 5 }), trade({ retSince: null })];
    expect(calculateMemberReturn(trades).tradeCount).toBe(2);
  });
});
