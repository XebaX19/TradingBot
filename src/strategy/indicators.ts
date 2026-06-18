/**
 * EMA = precio * k + EMA_anterior * (1 - k)
 * k = 2 / (periodo + 1)
 */
export function calculateEMA(
  prices: number[],
  period: number
): number | null {
  if (prices.length < period) {
    return null;
  }

  const multiplier =
    2 / (period + 1);

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
    ema =
      (prices[i] * multiplier) +
      (ema * (1 - multiplier));
  }

  return ema;
}

/**
 * RSI de Wilder.
 *
 * Punto critico:
 * El RSI no debe calcularse solo con la primera ventana. Se inicializa con el
 * promedio de los primeros `period` cambios y luego se suaviza hasta el ultimo
 * precio disponible para obtener el valor "actual" del indicador.
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
    const diff =
      prices[i] - prices[i - 1];

    if (diff >= 0) {
      gains += diff;
    } else {
      losses += Math.abs(diff);
    }
  }

  let averageGain =
    gains / period;
  let averageLoss =
    losses / period;

  for (let i = period + 1; i < prices.length; i++) {
    const diff =
      prices[i] - prices[i - 1];
    const gain =
      diff > 0 ? diff : 0;
    const loss =
      diff < 0 ? Math.abs(diff) : 0;

    averageGain =
      (
        (averageGain * (period - 1)) +
        gain
      )
      /
      period;

    averageLoss =
      (
        (averageLoss * (period - 1)) +
        loss
      )
      /
      period;
  }

  if (averageLoss === 0) {
    return 100;
  }

  const rs =
    averageGain / averageLoss;

  return 100 - (100 / (1 + rs));
}

/**
 * Volumen actual vs historico.
 */
export function calculateAverage(
  values: number[]
): number {
  return values.reduce(
    (a, b) => a + b,
    0
  )
  /
  values.length;
}
