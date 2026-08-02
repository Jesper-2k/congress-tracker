import { describe, expect, test } from "vitest";
import { getTradeDateRange } from "@/lib/dateRange";

describe("getTradeDateRange", () => {
  test("finds the earliest and latest transactionDate, regardless of array order", () => {
    const trades = [
      { transactionDate: "2024-06-01" },
      { transactionDate: "2023-01-15" },
      { transactionDate: "2024-12-25" },
    ];
    expect(getTradeDateRange(trades)).toEqual({ from: "2023-01-15", to: "2024-12-25" });
  });

  test("skips trades with no transactionDate", () => {
    const trades = [{ transactionDate: null }, { transactionDate: "2024-01-01" }, {}];
    expect(getTradeDateRange(trades)).toEqual({ from: "2024-01-01", to: "2024-01-01" });
  });

  test("returns nulls for an empty or all-dateless trade list", () => {
    expect(getTradeDateRange([])).toEqual({ from: null, to: null });
    expect(getTradeDateRange([{ transactionDate: null }])).toEqual({ from: null, to: null });
  });
});
