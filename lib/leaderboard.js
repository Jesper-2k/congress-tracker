// Builds the leaderboard's candidate pool server-side, once per cache
// window (see app/leaderboard/page.js, revalidate = 86400). For every
// qualifying member this precomputes calculateMemberReturn() — reused as-is
// from lib/simulator.js — across all three selectable time periods, so the
// chamber/party/period filter bar on the page can run entirely client-side
// over these small summaries (see components/LeaderboardTable.jsx) instead
// of re-fetching or re-ranking on every filter change.

import { calculateMemberReturn } from "@/lib/simulator";

const MIN_TRADES = 5;
const RECENCY_WINDOW_DAYS = 182; // ~6 months
const PERIODS = ["1y", "2y", "all"];
const PERIOD_DAYS = { "1y": 365, "2y": 730 };

function isoDaysAgo(days, from) {
  const d = new Date(from);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

function tradesInPeriod(trades, period, today) {
  if (period === "all") return trades;
  const cutoff = isoDaysAgo(PERIOD_DAYS[period], today);
  return trades.filter((t) => t.transactionDate >= cutoff);
}

// Eligibility (>=5 disclosed trades, >=1 in the last 6 months) is checked
// against the member's FULL trade history, independent of whichever period
// is selected in the UI — it answers "is this member active and tracked
// enough to rank at all," not "did they trade within period X."
function isEligible(memberTrades, today) {
  if (memberTrades.length < MIN_TRADES) return false;
  const cutoff = isoDaysAgo(RECENCY_WINDOW_DAYS, today);
  return memberTrades.some((t) => t.transactionDate >= cutoff);
}

export function buildLeaderboardCandidates(allTrades, today = new Date()) {
  const byMember = new Map();
  for (const trade of allTrades) {
    if (!trade.filerId) continue;
    if (!byMember.has(trade.filerId)) byMember.set(trade.filerId, []);
    byMember.get(trade.filerId).push(trade);
  }

  const candidates = [];
  for (const [filerId, memberTrades] of byMember) {
    if (!isEligible(memberTrades, today)) continue;

    const [first] = memberTrades;
    const byPeriod = {};
    for (const period of PERIODS) {
      const periodTrades = tradesInPeriod(memberTrades, period, today);
      byPeriod[period] = periodTrades.length > 0 ? calculateMemberReturn(periodTrades) : null;
    }

    candidates.push({
      filerId,
      name: first.memberName,
      party: first.party,
      chamber: first.chamber,
      byPeriod,
    });
  }

  return candidates;
}
