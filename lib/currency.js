// Fixed, approximate USD/EUR conversion for the portfolio simulator's
// currency selector. The simulator already estimates everything from
// disclosed transaction ranges rather than exact prices, so a live FX-rate
// API would add a third external dependency (alongside the trades dataset
// and Yahoo Finance) for a level of precision this feature doesn't
// otherwise have. Isolated here so a live rate can replace this later
// without touching any caller.
const USD_PER_EUR = 1.08;

export function toUsd(amount, currency) {
  return currency === "EUR" ? amount * USD_PER_EUR : amount;
}

export function fromUsd(amountUsd, currency) {
  if (amountUsd === null || amountUsd === undefined) return amountUsd;
  return currency === "EUR" ? amountUsd / USD_PER_EUR : amountUsd;
}
