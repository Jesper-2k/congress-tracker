import { afterEach, describe, expect, test, vi } from "vitest";
import { closeOnOrBefore, latestClose } from "@/lib/yahooFinance";

// getPriceHistory caches in module-level state, so each of its tests below
// needs a fresh module instance (vi.resetModules() + a dynamic import) to
// avoid one test's cache bleeding into the next.
async function freshYahooModule() {
  vi.resetModules();
  return import("@/lib/yahooFinance");
}

function chartResponse(closes) {
  return {
    ok: true,
    json: async () => ({
      chart: {
        result: [
          {
            timestamp: closes.map((_, i) => 1700000000 + i * 86400),
            indicators: { quote: [{ close: closes }] },
          },
        ],
      },
    }),
  };
}

const HISTORY = {
  dates: ["2024-01-01", "2024-01-10", "2024-01-20"],
  closes: [100, 110, 120],
};

describe("closeOnOrBefore", () => {
  test("returns the most recent close on or before the target date", () => {
    expect(closeOnOrBefore(HISTORY, "2024-01-05")).toBe(100);
  });

  test("returns that date's own close on an exact match", () => {
    expect(closeOnOrBefore(HISTORY, "2024-01-10")).toBe(110);
  });

  test("returns the last close when the target date is after the whole history", () => {
    expect(closeOnOrBefore(HISTORY, "2024-06-01")).toBe(120);
  });

  test("returns null when the target date is earlier than the first entry", () => {
    expect(closeOnOrBefore(HISTORY, "2023-12-01")).toBeNull();
  });

  test("returns null for a missing history instead of throwing", () => {
    expect(closeOnOrBefore(null, "2024-01-01")).toBeNull();
  });
});

describe("latestClose", () => {
  test("returns the last close in the series", () => {
    expect(latestClose(HISTORY)).toBe(120);
  });

  test("returns null for a missing history", () => {
    expect(latestClose(null)).toBeNull();
  });

  test("returns null for an empty close series", () => {
    expect(latestClose({ dates: [], closes: [] })).toBeNull();
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("getPriceHistory", () => {
  test("parses a successful chart response into parallel dates/closes arrays", async () => {
    const { getPriceHistory } = await freshYahooModule();
    vi.stubGlobal("fetch", vi.fn(async () => chartResponse([100, 105, 110])));

    const history = await getPriceHistory("AAPL");
    expect(history.closes).toEqual([100, 105, 110]);
    expect(history.dates).toHaveLength(3);
  });

  test("serves a second call from the in-memory cache instead of re-fetching", async () => {
    const { getPriceHistory } = await freshYahooModule();
    const fetchMock = vi.fn(async () => chartResponse([100]));
    vi.stubGlobal("fetch", fetchMock);

    await getPriceHistory("AAPL");
    await getPriceHistory("AAPL");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("falls back to the last successful history when a later fetch fails, instead of null", async () => {
    const { getPriceHistory } = await freshYahooModule();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(chartResponse([100, 105]))
      .mockRejectedValueOnce(new Error("network down"));
    vi.stubGlobal("fetch", fetchMock);

    const first = await getPriceHistory("AAPL");
    // historyCache TTL is 24h; force this call past it to exercise the
    // fetch-then-fail path rather than a cache hit.
    vi.spyOn(Date, "now").mockReturnValue(Date.now() + 25 * 60 * 60 * 1000);
    const second = await getPriceHistory("AAPL");

    expect(second).toEqual(first);
  });

  test("returns null for a ticker that has never been fetched successfully", async () => {
    const { getPriceHistory } = await freshYahooModule();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down");
      })
    );

    expect(await getPriceHistory("NEVERFETCHED")).toBeNull();
  });

  test("cache hits return a copy, not the same object reference each time", async () => {
    const { getPriceHistory } = await freshYahooModule();
    vi.stubGlobal("fetch", vi.fn(async () => chartResponse([100])));

    const first = await getPriceHistory("AAPL");
    const second = await getPriceHistory("AAPL");
    expect(first).not.toBe(second);
    expect(first.dates).not.toBe(second.dates);
    expect(first).toEqual(second);
  });
});
