import { NextResponse } from "next/server";
import { getLatestTrades } from "@/lib/trades";
import { AMOUNT_MIDPOINTS } from "@/lib/members";
import { getPriceHistory, getPriceHistories } from "@/lib/yahooFinance";
import { selectTopTickers, runSimulation } from "@/lib/portfolioSimulator";
import { toUsd, fromUsd } from "@/lib/currency";

const SPY_TICKER = "SPY";

// Converts a computed result (all internal math is in USD) back to the
// currency the user asked for. Percentages are ratios, so they're
// currency-agnostic and pass through unchanged.
function convertToCurrency(result, currency) {
  const c = (v) => fromUsd(v, currency);

  return {
    ...result,
    scenarios: {
      transaction: result.scenarios.transaction && {
        ...result.scenarios.transaction,
        totalValue: c(result.scenarios.transaction.totalValue),
        spyValue: c(result.scenarios.transaction.spyValue),
      },
      disclosure: result.scenarios.disclosure && {
        ...result.scenarios.disclosure,
        totalValue: c(result.scenarios.disclosure.totalValue),
        spyValue: c(result.scenarios.disclosure.spyValue),
      },
    },
    chartSeries: result.chartSeries.map((point) => ({
      date: point.date,
      portfolio: c(point.portfolio),
      spy: c(point.spy),
    })),
    tradeLog: result.tradeLog.map((row) => ({
      ...row,
      amountInvested: c(row.amountInvested),
      transactionScenario: row.transactionScenario && {
        ...row.transactionScenario,
        value: c(row.transactionScenario.value),
      },
      disclosureScenario: row.disclosureScenario && {
        ...row.disclosureScenario,
        value: c(row.disclosureScenario.value),
      },
    })),
  };
}

export async function GET(request, { params }) {
  const { filerId } = await params;
  const { searchParams } = new URL(request.url);

  const amountRaw = Number(searchParams.get("amount"));
  const currency = searchParams.get("currency") === "USD" ? "USD" : "EUR";

  if (!Number.isFinite(amountRaw) || amountRaw <= 0) {
    return NextResponse.json({ error: "Enter a starting amount greater than zero." }, { status: 400 });
  }

  const { trades: allTrades, error } = await getLatestTrades();
  if (error) {
    return NextResponse.json({ error }, { status: 502 });
  }

  const buyTrades = allTrades.filter(
    (trade) => trade.filerId === filerId && trade.type === "buy" && trade.ticker
  );
  if (buyTrades.length === 0) {
    return NextResponse.json(
      { error: "No priceable disclosed buy trades for this member." },
      { status: 404 }
    );
  }

  // SPY is the benchmark leg for every trade in both scenarios — without
  // it there's nothing to compare against, so a failure here fails the
  // whole simulation rather than degrading gracefully like an individual
  // ticker would.
  const spyHistory = await getPriceHistory(SPY_TICKER);
  if (!spyHistory) {
    return NextResponse.json(
      { error: "Couldn't load SPY benchmark data from Yahoo Finance. Try again shortly." },
      { status: 502 }
    );
  }

  // Only the member's top MAX_TICKERS by disclosed volume get a Yahoo
  // Finance call — trades in tickers outside that set (or that Yahoo fails
  // to price) are excluded uniformly inside runSimulation, not treated as
  // a separate error case.
  const topTickers = selectTopTickers(buyTrades, AMOUNT_MIDPOINTS);
  const priceHistories = await getPriceHistories(topTickers);

  const startingAmountUSD = toUsd(amountRaw, currency);
  const result = runSimulation({
    buyTrades,
    midpoints: AMOUNT_MIDPOINTS,
    priceHistories,
    spyHistory,
    startingAmountUSD,
  });

  return NextResponse.json({
    ...convertToCurrency(result, currency),
    currency,
    startingAmount: amountRaw,
    tickersConsidered: topTickers.length,
    tradeCount: buyTrades.length,
  });
}
