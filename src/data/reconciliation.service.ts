import { CandleRepository } from "../repositories/candle.repository";
import { BinanceClient } from "./binance.client";
import { Candle } from "../models/candle.model";
import { ReconciliationIssue, ReconciliationResult } from "../models/reconciliation.model";
import {
  clampToLastClosedCandleUtc,
  generateHourlyRange,
  getIntervalMs,
  listUtcDaysBetween,
  startOfUtcDay
} from "../shared/date.utils";
import { env } from "../config/env";
import { logger } from "../shared/logger";

export class CandleReconciliationService {
  constructor(
    private candleRepository: CandleRepository,
    private binance: BinanceClient
  ) { }

  async execute(
    from: Date,
    to: Date
  ): Promise<ReconciliationResult> {
    logger.info(
      `Starting reconciliation ${from} - ${to}`
    );

    const boundedTo =
      clampToLastClosedCandleUtc(
        to,
        new Date(),
        env.market.timeframe
      );
    const dayRanges =
      this.buildDailyRanges(
        from,
        boundedTo
      );
    let checked = 0;
    let missing = 0;
    let recovered = 0;
    let duplicates = 0;
    let invalid = 0;
    const issues: ReconciliationIssue[] = [];
    const recoveredCandles: Candle[] = [];

    for (const range of dayRanges) {
      const dayResult =
        await this.reconcileRange(
          range.from,
          range.to
        );

      checked += dayResult.checked;
      missing += dayResult.missing;
      recovered += dayResult.recovered;
      duplicates += dayResult.duplicates;
      invalid += dayResult.invalid;
      issues.push(...dayResult.issues);
      recoveredCandles.push(
        ...dayResult.recoveredCandles
      );
    }

    return {
      checked,
      missing,
      recovered,
      duplicates,
      invalid,
      issues,
      recoveredCandles
    };
  }

  async recoverRange(
    from: Date,
    to: Date
  ) {
    const result =
      await this.fetchCandlesFromExchange(
        from,
        to
      );
    const recoveredCandles: Candle[] = [];

    for (const candle of result) {
      await this.candleRepository.insert(
        candle
      );
      recoveredCandles.push(candle);
    }

    return recoveredCandles;
  }

  private buildDailyRanges(
    from: Date,
    to: Date
  ) {
    const intervalMs =
      getIntervalMs(env.market.timeframe);

    return listUtcDaysBetween(
      from,
      to
    ).map(day => {
      const dayFrom =
        startOfUtcDay(day);
      const dayTo =
        new Date(
          dayFrom.getTime() +
          (24 * 60 * 60 * 1000) -
          intervalMs
        );

      return {
        from:
          from > dayFrom
            ? dayFrom
            : dayFrom,
        to:
          to < dayTo
            ? to
            : dayTo
      };
    });
  }

  /**
   * Reconciliamos siempre la ventana diaria completa afectada. Si falta una
   * vela dentro del dia, no validamos solo ese hueco: re-evaluamos todo el dia
   * para detectar faltantes, duplicados e inconsistencias internas.
   */
  private async reconcileRange(
    from: Date,
    to: Date
  ): Promise<ReconciliationResult> {
    const expected =
      generateHourlyRange(from, to);
    const candles =
      await this.candleRepository.getCandlesByRange(
        env.market.symbol,
        env.market.timeframe,
        from,
        to
      );
    const duplicatesInRange =
      await this.candleRepository.getDuplicateOpenTimes(
        env.market.symbol,
        env.market.timeframe,
        from,
        to
      );
    const candleByTime =
      new Map(
        candles.map(candle => [
          candle.openTime.getTime(),
          candle
        ])
      );
    const missingOpenTimes =
      expected.filter(
        expectedTime =>
          !candleByTime.has(
            expectedTime.getTime()
          )
      );
    const issues: ReconciliationIssue[] = [];

    for (const missingTime of missingOpenTimes) {
      issues.push({
        type: "MISSING",
        openTime: missingTime,
        detail: "Missing candle detected"
      });
    }

    for (const duplicate of duplicatesInRange) {
      issues.push({
        type: "DUPLICATE",
        openTime: duplicate.openTime,
        detail: `Detected ${duplicate.total} rows for the same open_time`
      });
    }

    const invalidIssues =
      this.validateCandles(candles);
    issues.push(...invalidIssues);

    const recoveredCandles: Candle[] =
      [];

    for (const missingTime of missingOpenTimes) {
      const recovered =
        await this.recoverSingleCandle(
          missingTime
        );

      if (recovered) {
        recoveredCandles.push(recovered);
      }
    }

    return {
      checked: expected.length,
      missing: missingOpenTimes.length,
      recovered: recoveredCandles.length,
      duplicates: duplicatesInRange.length,
      invalid: invalidIssues.length,
      issues,
      recoveredCandles
    };
  }

  private validateCandles(
    candles: Candle[]
  ) {
    const issues: ReconciliationIssue[] = [];

    for (const candle of candles) {
      if (
        candle.open <= 0 ||
        candle.high <= 0 ||
        candle.low <= 0 ||
        candle.close <= 0
      ) {
        issues.push({
          type: "NON_POSITIVE_PRICE",
          openTime: candle.openTime,
          detail: "Found non-positive OHLC value"
        });
      }

      if (candle.volume < 0) {
        issues.push({
          type: "NEGATIVE_VOLUME",
          openTime: candle.openTime,
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
        issues.push({
          type: "INVALID_OHLC",
          openTime: candle.openTime,
          detail: "OHLC values are outside valid candle bounds"
        });
      }
    }

    return issues;
  }

  private async recoverSingleCandle(
    date: Date
  ) {
    const candles =
      await this.fetchCandlesFromExchange(
        date,
        date
      );

    if (candles.length === 0) {
      logger.warn(
        `No data Binance ${date.toISOString()}`
      );
      return null;
    }

    const candle =
      candles[0];

    await this.candleRepository.insert(
      candle
    );

    logger.info(
      `Recovered ${date.toISOString()}`
    );

    return candle;
  }

  private async fetchCandlesFromExchange(
    from: Date,
    to: Date
  ) {
    const intervalMs =
      getIntervalMs(env.market.timeframe);
    const rawCandles =
      await this.binance.getCandles(
        env.market.symbol,
        env.market.timeframe,
        from.getTime(),
        to.getTime() + intervalMs
      );

    return rawCandles.map(
      (candle: any) => ({
        symbol: env.market.symbol,
        timeframe: env.market.timeframe,
        openTime: new Date(candle[0]),
        open: Number(candle[1]),
        high: Number(candle[2]),
        low: Number(candle[3]),
        close: Number(candle[4]),
        volume: Number(candle[5])
      })
    );
  }
}
