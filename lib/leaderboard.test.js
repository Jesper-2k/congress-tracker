import { describe, expect, test } from "vitest";
import { buildLeaderboardCandidates } from "@/lib/leaderboard";

const TODAY = new Date("2024-06-15T00:00:00Z");

function trade(overrides) {
  return {
    filerId: "house_test_member",
    memberName: "Test Member",
    party: "D",
    chamber: "House",
    ticker: "AAPL",
    transactionDate: "2024-06-01",
    retSince: 5,
    excessSince: 2,
    ...overrides,
  };
}

describe("buildLeaderboardCandidates", () => {
  test("excludes members with fewer than 5 disclosed trades", () => {
    const trades = [1, 2, 3, 4].map(() => trade({ filerId: "house_too_few" }));
    expect(buildLeaderboardCandidates(trades, TODAY)).toEqual([]);
  });

  test("excludes members with 5+ trades but none in the last ~6 months", () => {
    const trades = [1, 2, 3, 4, 5].map(() =>
      trade({ filerId: "house_stale", transactionDate: "2020-01-01" })
    );
    expect(buildLeaderboardCandidates(trades, TODAY)).toEqual([]);
  });

  test("ignores trades with no filerId", () => {
    const trades = [1, 2, 3, 4, 5].map(() => trade({ filerId: null }));
    expect(buildLeaderboardCandidates(trades, TODAY)).toEqual([]);
  });

  test("includes an eligible member and buckets trades correctly per period", () => {
    const trades = [
      trade({ transactionDate: "2024-06-01" }), // within 1y, 2y, recency
      trade({ transactionDate: "2023-08-01" }), // within 1y and 2y
      trade({ transactionDate: "2022-08-01" }), // within 2y only
      trade({ transactionDate: "2020-01-01" }), // "all" only
      trade({ transactionDate: "2019-01-01" }), // "all" only
    ];

    const candidates = buildLeaderboardCandidates(trades, TODAY);
    expect(candidates).toHaveLength(1);

    const [candidate] = candidates;
    expect(candidate).toMatchObject({
      filerId: "house_test_member",
      name: "Test Member",
      party: "D",
      chamber: "House",
    });
    expect(candidate.byPeriod["1y"].tradeCount).toBe(2);
    expect(candidate.byPeriod["2y"].tradeCount).toBe(3);
    expect(candidate.byPeriod.all.tradeCount).toBe(5);
  });

  test("eligibility is based on full trade history, independent of which period ends up selected", () => {
    // Only eligible via one recent trade; the other 4 are ancient, but the
    // member should still show up with a populated "all" period.
    const trades = [
      trade({ transactionDate: "2024-06-10" }),
      ...[1, 2, 3, 4].map(() => trade({ transactionDate: "2015-01-01" })),
    ];
    const candidates = buildLeaderboardCandidates(trades, TODAY);
    expect(candidates).toHaveLength(1);
    expect(candidates[0].byPeriod.all.tradeCount).toBe(5);
  });

  test("keeps separate members independent", () => {
    const trades = [
      ...[1, 2, 3, 4, 5].map(() => trade({ filerId: "house_a", memberName: "A" })),
      ...[1, 2, 3].map(() => trade({ filerId: "house_b", memberName: "B" })), // ineligible
    ];
    const candidates = buildLeaderboardCandidates(trades, TODAY);
    expect(candidates.map((c) => c.filerId)).toEqual(["house_a"]);
  });
});
