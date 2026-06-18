import { CandleRepository } from "../repositories/candle.repository";
import { BinanceClient } from "./binance.client";
import { generateHourlyRange } from "../shared/date.utils";
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
  ) {
    logger.info(
      `Starting reconciliation ${from} - ${to}`
    );

    const expected =
      generateHourlyRange(
        from,
        to
      );

    const existing =
      await this.candleRepository.getByRange(
        env.market.symbol,
        env.market.timeframe,
        from,
        to
      );

    const missing =
      expected.filter(
        date =>
          !existing.some(
            x => x.getTime() === date.getTime()
          )
      );

    logger.info(
      `Missing candles: ${missing.length}`
    );

    let recovered = 0;

    for (const candleDate of missing) {
      const wasRecovered =
        await this.recoverCandle(
        candleDate
      );

      if (wasRecovered) {
        recovered += 1;
      }
    }

    return {
      checked: expected.length,
      missing: missing.length,
      recovered
    };
  }

  private async recoverCandle(
    date: Date
  ) {
    const start = date.getTime();
    const end = start + (60 * 60 * 1000);
    const candles =
      await this.binance.getCandles(
        env.market.symbol,
        env.market.timeframe,
        start,
        end
      );

    if (!candles.length) {
      logger.warn(
        `No data Binance ${date}`
      );
      return false;
    }

    const c =
      candles[0];

    await this.candleRepository.insert({
      symbol: env.market.symbol,
      timeframe: env.market.timeframe,
      openTime: new Date(c[0]),
      open: Number(c[1]),
      high: Number(c[2]),
      low: Number(c[3]),
      close: Number(c[4]),
      volume: Number(c[5])
    });

    logger.info(
      `Recovered ${date}`
    );

    return true;
  }
}
