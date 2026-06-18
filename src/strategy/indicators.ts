/**
 * Formula
 * EMA = precio * k + EMA anterior * (1-k)
 * k = 2 / (periodo + 1)
 */

export function calculateEMA(
  prices: number[],
  period: number
): number | null {

  if (prices.length < period) {
    return null;
  }

  const multiplier = 2 / (period + 1);

  let ema =
    prices
      .slice(0, period)
      .reduce(
        (a, b) => a + b,
        0
      )
    /
    period;

  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
  }

  return ema;
}

/**
 * Formula
 * RSI = 100 - (100 / (1 + RS))
 */
export function calculateRSI(
  prices: number[],
  period: number = 14
): number | null {
  if (prices.length <= period) {
    return null;
  }

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = prices[i] - prices[i - 1];

    if (diff >= 0) {
      gains += diff;
    }
    else {
      losses += Math.abs(diff);
    }
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  if (avgLoss === 0) {
    return 100;
  }

  let rs = avgGain / avgLoss;
  let rsi = 100 - (100 / (1 + rs));

  return rsi;
}

/**
 * Volumen actual vs historico
 */
export function calculateAverage(
  values: number[]
): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}
