import { describe, expect, test } from "vitest";
import { buildTraderSummary } from "@/lib/traderSummary";

function trade(overrides) {
  return {
    filerId: "house_test",
    memberName: "Test Member",
    party: "D",
    chamber: "House",
    type: "buy",
    amount: "$1,001 - $15,000", // midpoint 8000
    transactionDate: "2024-01-01",
    ...overrides,
  };
}

describe("buildTraderSummary", () => {
  test("groups trades by filerId and counts buys/sells", () => {
    const trades = [
      trade({ type: "buy" }),
      trade({ type: "buy" }),
      trade({ type: "sell" }),
    ];
    const [summary] = buildTraderSummary(trades);
    expect(summary).toMatchObject({
      filerId: "house_test",
      name: "Test Member",
      tradeCount: 3,
      buyCount: 2,
      sellCount: 1,
    });
  });

  test("sums estVolume from recognized amount brackets, skipping unrecognized ones", () => {
    const trades = [
      trade({ amount: "$1,001 - $15,000" }), // 8000
      trade({ amount: "$15,001 - $50,000" }), // 32500
      trade({ amount: "not a real bracket" }), // ignored
    ];
    const [summary] = buildTraderSummary(trades);
    expect(summary.estVolume).toBe(8000 + 32500);
  });

  test("tracks the latest transactionDate regardless of array order", () => {
    const trades = [
      trade({ transactionDate: "2023-06-01" }),
      trade({ transactionDate: "2024-01-01" }),
      trade({ transactionDate: "2023-01-01" }),
    ];
    const [summary] = buildTraderSummary(trades);
    expect(summary.lastTradeDate).toBe("2024-01-01");
  });

  test("keeps separate members independent and skips trades with no filerId", () => {
    const trades = [
      trade({ filerId: "house_a", memberName: "A" }),
      trade({ filerId: "house_b", memberName: "B" }),
      trade({ filerId: null }),
    ];
    const summary = buildTraderSummary(trades);
    expect(summary).toHaveLength(2);
    expect(summary.map((s) => s.filerId).sort()).toEqual(["house_a", "house_b"]);
  });
});
