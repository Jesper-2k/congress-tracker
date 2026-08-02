import { describe, expect, test } from "vitest";
import { getMonthlyActivity } from "@/lib/monthlyActivity";

const REFERENCE = new Date("2024-06-15T00:00:00Z");

describe("getMonthlyActivity", () => {
  test("builds 12 trailing buckets ending at the reference month", () => {
    const buckets = getMonthlyActivity([], REFERENCE);
    expect(buckets).toHaveLength(12);
    expect(buckets[0]).toMatchObject({ key: "2023-07", month: "Jul", year: 2023 });
    expect(buckets[11]).toMatchObject({ key: "2024-06", month: "Jun", year: 2024 });
  });

  test("counts trades into the bucket matching their transaction month", () => {
    const trades = [
      { transactionDate: "2024-06-05", type: "buy" },
      { transactionDate: "2024-06-20", type: "buy" },
      { transactionDate: "2024-06-25", type: "sell" },
    ];
    const buckets = getMonthlyActivity(trades, REFERENCE);
    const june = buckets.find((b) => b.key === "2024-06");
    expect(june).toMatchObject({ count: 3, buyCount: 2, sellCount: 1, dominant: "buy" });
  });

  test("silently drops trades outside the trailing 12-month window instead of erroring", () => {
    const trades = [{ transactionDate: "2022-01-01", type: "buy" }];
    const buckets = getMonthlyActivity(trades, REFERENCE);
    expect(buckets.every((b) => b.count === 0)).toBe(true);
  });

  test("skips trades with no transactionDate", () => {
    const trades = [{ transactionDate: null, type: "buy" }];
    const buckets = getMonthlyActivity(trades, REFERENCE);
    expect(buckets.every((b) => b.count === 0)).toBe(true);
  });

  test.each([
    [2, 1, "buy"],
    [1, 2, "sell"],
    [1, 1, "tie"],
    [0, 0, "tie"],
  ])("dominant is %s buys vs %s sells -> %s", (buyCount, sellCount, expected) => {
    const trades = [
      ...Array.from({ length: buyCount }, () => ({ transactionDate: "2024-06-01", type: "buy" })),
      ...Array.from({ length: sellCount }, () => ({ transactionDate: "2024-06-01", type: "sell" })),
    ];
    const june = getMonthlyActivity(trades, REFERENCE).find((b) => b.key === "2024-06");
    expect(june.dominant).toBe(expected);
  });
});
