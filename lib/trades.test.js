import { afterEach, describe, expect, test, vi } from "vitest";

// getLatestTrades caches in module-level state, so each test needs a fresh
// module instance (vi.resetModules() + a dynamic import) to avoid one
// test's cache bleeding into the next.
async function freshTradesModule() {
  vi.resetModules();
  return import("@/lib/trades");
}

function rawTrade(overrides) {
  return {
    id: "1",
    branch: "congress",
    filer_id: "house_test",
    filer_name: "Test Member",
    chamber: "house",
    party: "D",
    ticker: "AAPL",
    transaction_type: "purchase",
    amount_range_label: "$1,001 - $15,000",
    transaction_date: "2024-01-01",
    filing_date: "2024-01-15",
    ret_since: 5,
    excess_since: 2,
    ...overrides,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("getLatestTrades", () => {
  test("normalizes raw records and filters out non-congress branches", async () => {
    const { getLatestTrades } = await freshTradesModule();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => [rawTrade({}), rawTrade({ branch: "executive" })],
      }))
    );

    const { trades, error } = await getLatestTrades();
    expect(error).toBeNull();
    expect(trades).toHaveLength(1);
    expect(trades[0]).toMatchObject({ filerId: "house_test", chamber: "House", type: "buy" });
  });

  test("serves a second call from the in-memory cache instead of re-fetching", async () => {
    const { getLatestTrades } = await freshTradesModule();
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => [rawTrade({})] }));
    vi.stubGlobal("fetch", fetchMock);

    await getLatestTrades();
    await getLatestTrades();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("fresh:true bypasses the cache even when it's still warm", async () => {
    const { getLatestTrades } = await freshTradesModule();
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => [rawTrade({})] }));
    vi.stubGlobal("fetch", fetchMock);

    await getLatestTrades();
    await getLatestTrades({ fresh: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  test("falls back to stale cached trades instead of erroring when a later fetch fails", async () => {
    const { getLatestTrades } = await freshTradesModule();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => [rawTrade({})] })
      .mockRejectedValueOnce(new Error("network down"));
    vi.stubGlobal("fetch", fetchMock);

    await getLatestTrades();
    const { trades, error } = await getLatestTrades({ fresh: true });
    expect(error).toBeNull();
    expect(trades).toHaveLength(1);
  });

  test("returns an error and no trades when the first-ever fetch fails with nothing cached yet", async () => {
    const { getLatestTrades } = await freshTradesModule();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down");
      })
    );

    const { trades, error } = await getLatestTrades();
    expect(trades).toEqual([]);
    expect(error).toBe("network down");
  });

  test("cache hits return a fresh array copy each time, not a shared reference", async () => {
    const { getLatestTrades } = await freshTradesModule();
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => [rawTrade({})] })));

    const first = await getLatestTrades();
    const second = await getLatestTrades();
    expect(first.trades).not.toBe(second.trades);
    expect(first.trades).toEqual(second.trades);
  });

  test("applies the manual party override for filers the upstream dataset has no party for", async () => {
    const { getLatestTrades } = await freshTradesModule();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => [
          rawTrade({ filer_id: "senate_alan_armstrong", filer_name: "Alan Armstrong", party: null }),
          rawTrade({ filer_id: "senate_a_mitchell", filer_name: "A. Mitchell", party: null }),
        ],
      }))
    );

    const { trades } = await getLatestTrades();
    expect(trades[0].party).toBe("R");
    expect(trades[1].party).toBe("R");
  });

  test("leaves party null for filers with no override and no upstream party", async () => {
    const { getLatestTrades } = await freshTradesModule();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => [rawTrade({ filer_id: "senate_someone_else", party: null })],
      }))
    );

    const { trades } = await getLatestTrades();
    expect(trades[0].party).toBeNull();
  });
});
