import { env } from "../config/env";
import { Candle } from "../models/candle.model";
import {
  BacktestDataQualityIssue,
  BacktestDataQualityReport
} from "../models/backtest.model";
import { getIntervalMs } from "../shared/date.utils";

export class BacktestDataValidatorService {
  /**
   * Valida continuidad y consistencia del dataset antes de correr el backtest.
   *
   * Punto critico:
   * Si la base historica tiene huecos o velas invalidas, el resultado puede ser
   * estadisticamente inutil aunque la corrida termine "sin error".
   */
  validate(
    candles: Candle[],
    warmupCandlesRequired: number
  ): BacktestDataQualityReport {
    const issues: BacktestDataQualityIssue[] = [];
    const intervalMs =
      getIntervalMs(env.market.timeframe);

    if (candles.length <= warmupCandlesRequired) {
      issues.push({
        type: "INSUFFICIENT_HISTORY",
        detail:
          `Backtest requires more than ${warmupCandlesRequired} candles and received ${candles.length}`
      });
    }

    let gapCount = 0;
    let duplicateCount = 0;
    let invalidCandleCount = 0;

    for (let i = 0; i < candles.length; i++) {
      const candle =
        candles[i];

      if (
        candle.open <= 0 ||
        candle.high <= 0 ||
        candle.low <= 0 ||
        candle.close <= 0
      ) {
        invalidCandleCount += 1;
        issues.push({
          type: "NON_POSITIVE_PRICE",
          timestamp: candle.openTime,
          detail: "Found non-positive OHLC value"
        });
      }

      if (candle.volume < 0) {
        invalidCandleCount += 1;
        issues.push({
          type: "NEGATIVE_VOLUME",
          timestamp: candle.openTime,
          detail: "Found negative volume"
        });
      }

      const invalidOhlc =
        candle.high < candle.low ||
        candle.open > candle.high ||
        candle.open < candle.low ||
        candle.close > candle.high ||
        candle.close < candle.low;

      if (invalidOhlc) {
        invalidCandleCount += 1;
        issues.push({
          type: "INVALID_OHLC",
          timestamp: candle.openTime,
          detail: "OHLC values are outside valid candle bounds"
        });
      }

      if (i === 0) {
        continue;
      }

      const previous =
        candles[i - 1];
      const delta =
        candle.openTime.getTime() -
        previous.openTime.getTime();

      if (delta === 0) {
        duplicateCount += 1;
        issues.push({
          type: "DUPLICATE",
          timestamp: candle.openTime,
          detail:
            `Duplicate candle timestamp at ${candle.openTime.toISOString()}`
        });
      } else if (delta !== intervalMs) {
        gapCount += 1;
        const missingCandles =
          Math.max(
            0,
            Math.floor(
              delta / intervalMs
            ) - 1
          );
        const expectedNext =
          new Date(
            previous.openTime.getTime() +
            intervalMs
          );
        issues.push({
          type: "GAP",
          timestamp: candle.openTime,
          detail:
            `Gap after ${previous.openTime.toISOString()} and before ${candle.openTime.toISOString()} (${missingCandles} missing candle(s), expected next ${expectedNext.toISOString()}, found delta ${delta}ms)`
        });
      }
    }

    return {
      isValid: issues.length === 0,
      expectedCandles: candles.length === 0
        ? 0
        : Math.floor(
          (
            candles[candles.length - 1].openTime.getTime() -
            candles[0].openTime.getTime()
          ) / intervalMs
        ) + 1,
      actualCandles: candles.length,
      gapCount,
      duplicateCount,
      invalidCandleCount,
      warmupCandlesRequired,
      issues
    };
  }
}
