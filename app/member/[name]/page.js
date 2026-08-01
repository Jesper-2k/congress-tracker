import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getLatestTrades } from "@/lib/trades";
import { getMemberProfile, getMemberStats, getInferredPortfolio } from "@/lib/members";
import { getCurrentPrices } from "@/lib/yahooFinance";
import MemberHeader from "@/components/MemberHeader";
import MemberStatCards from "@/components/MemberStatCards";
import InferredPortfolio from "@/components/InferredPortfolio";
import MemberTradeHistory from "@/components/MemberTradeHistory";
import PortfolioSimulator from "@/components/PortfolioSimulator";
import ScrollToSimulator from "@/components/ScrollToSimulator";
import MonthlyActivityChart from "@/components/MonthlyActivityChart";
import BuySellDonut from "@/components/BuySellDonut";
import SetupNotice from "@/components/SetupNotice";

// Same hourly cache window as the main dashboard (app/page.js).
export const revalidate = 3600;

// The dynamic segment is named [name] for a readable URL shape
// (/member/house_pete_sessions), but its value is filerId, not the display
// name — filer_id is the stable, URL-safe identifier the dataset already
// provides per member (chamber-prefixed, so it stays unique even if two
// members across chambers ever share a name), where a slugified display
// name would need extra encoding and dedup logic we'd otherwise have to
// build ourselves.
export default async function MemberPage({ params }) {
  const { name: filerId } = await params;
  const { trades: allTrades, error } = await getLatestTrades();

  if (error) {
    return (
      <main className="min-h-full flex-1 bg-neutral-50 dark:bg-neutral-950">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <SetupNotice error={error} />
        </div>
      </main>
    );
  }

  const memberTrades = allTrades.filter((trade) => trade.filerId === filerId);
  if (memberTrades.length === 0) notFound();

  const profile = getMemberProfile(memberTrades);
  const stats = getMemberStats(memberTrades);

  const tickersHeld = [...new Set(memberTrades.map((trade) => trade.ticker).filter(Boolean))];
  const priceMap = await getCurrentPrices(tickersHeld);
  const portfolio = getInferredPortfolio(memberTrades, priceMap);

  return (
    <main className="min-h-full flex-1 bg-neutral-50 dark:bg-neutral-950">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <MemberHeader profile={profile} />
        <MemberStatCards stats={stats} />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <MonthlyActivityChart
            trades={memberTrades}
            title={`${profile.name} — monthly activity`}
          />
          <BuySellDonut trades={memberTrades} title="Buy / sell split" />
        </div>

        <InferredPortfolio rows={portfolio} />
        <MemberTradeHistory trades={memberTrades} />

        <PortfolioSimulator filerId={filerId} />
        <Suspense fallback={null}>
          <ScrollToSimulator />
        </Suspense>
      </div>
    </main>
  );
}
