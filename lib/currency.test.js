import { describe, expect, test } from "vitest";
import { toUsd, fromUsd } from "@/lib/currency";

describe("toUsd", () => {
  test("converts EUR to USD", () => {
    expect(toUsd(100, "EUR")).toBeCloseTo(108, 5);
  });

  test("passes USD through unchanged", () => {
    expect(toUsd(100, "USD")).toBe(100);
  });
});

describe("fromUsd", () => {
  test("converts USD to EUR", () => {
    expect(fromUsd(108, "EUR")).toBeCloseTo(100, 5);
  });

  test("passes USD through unchanged", () => {
    expect(fromUsd(100, "USD")).toBe(100);
  });

  test("round-trips through toUsd/fromUsd", () => {
    expect(fromUsd(toUsd(250, "EUR"), "EUR")).toBeCloseTo(250, 5);
  });

  test("passes through null and undefined instead of computing on them", () => {
    expect(fromUsd(null, "EUR")).toBeNull();
    expect(fromUsd(undefined, "USD")).toBeUndefined();
  });
});
