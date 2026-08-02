import { describe, expect, test } from "vitest";
import { formatMoney, formatPercent } from "@/lib/format";

describe("formatMoney", () => {
  test("formats USD with no decimal places by default", () => {
    expect(formatMoney(1234)).toBe("$1,234");
  });

  test("rounds to the nearest whole unit", () => {
    expect(formatMoney(1234.56)).toBe("$1,235");
  });

  test("formats a non-USD currency when given one", () => {
    expect(formatMoney(1000, "EUR")).toContain("1,000");
  });

  test.each([null, undefined, NaN])("renders %s as an em dash", (value) => {
    expect(formatMoney(value)).toBe("—");
  });
});

describe("formatPercent", () => {
  test("prefixes positive values with a plus sign", () => {
    expect(formatPercent(5.678)).toBe("+5.7%");
  });

  test("leaves negative values with their own minus sign", () => {
    expect(formatPercent(-3.21)).toBe("-3.2%");
  });

  test("does not add a plus sign for exactly zero", () => {
    expect(formatPercent(0)).toBe("0.0%");
  });

  test.each([null, undefined])("renders %s as an em dash", (value) => {
    expect(formatPercent(value)).toBe("—");
  });
});
