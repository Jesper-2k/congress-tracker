// Groups an already-filtered trade list by member for the dashboard's
// "Top Traders" view (see components/TopTradersTable.jsx) — a flat list of
// every individual trade isn't useful as a landing view once the dataset
// has more than a handful of members; this answers "who's trading the
// most" instead, with the per-member trade list one click away on their
// profile page.

import { AMOUNT_MIDPOINTS } from "@/lib/members";

export function buildTraderSummary(trades) {
  const byMember = new Map();

  for (const trade of trades) {
    if (!trade.filerId) continue;

    if (!byMember.has(trade.filerId)) {
      byMember.set(trade.filerId, {
        filerId: trade.filerId,
        name: trade.memberName,
        party: trade.party,
        chamber: trade.chamber,
        tradeCount: 0,
        buyCount: 0,
        sellCount: 0,
        estVolume: 0,
        lastTradeDate: null,
      });
    }

    const entry = byMember.get(trade.filerId);
    entry.tradeCount += 1;
    if (trade.type === "buy") entry.buyCount += 1;
    else if (trade.type === "sell") entry.sellCount += 1;

    const midpoint = AMOUNT_MIDPOINTS[trade.amount];
    if (midpoint !== undefined) entry.estVolume += midpoint;

    if (trade.transactionDate && (!entry.lastTradeDate || trade.transactionDate > entry.lastTradeDate)) {
      entry.lastTradeDate = trade.transactionDate;
    }
  }

  return [...byMember.values()];
}
