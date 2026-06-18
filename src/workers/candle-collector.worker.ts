import cron from "node-cron";
import { CandleReconciliationService } from "../data/reconciliation.service";
import { CandleRepository } from "../repositories/candle.repository";
import { BinanceClient } from "../data/binance.client";
import { env } from "../config/env";
import { logger } from "../shared/logger";
import { retry } from "../shared/retry.utils";
import { getIntervalMs, getLastClosedCandleOpenTimeUtc } from "../shared/date.utils";

export class CandleCollectorWorker {
  constructor(
    private candleRepository: CandleRepository,
    private binance: BinanceClient,
    private reconciliationService?: CandleReconciliationService
  ) { }

  start() {
    /*    
    Ejecuta a los minutos 5 de cada hora

    10:05
    11:05
    12:05    
    */
    cron.schedule(
      "5 * * * *",
      async () => {
        await this.collect();
      }
    );

    logger.info(
      "Candle collector started"
    );
  }

  async collect() {
    try {
      const lastStoredOpenTime =
        await this.candleRepository.getLastCandle(
          env.market.symbol,
          env.market.timeframe
        );
      const lastClosedOpenTime =
        getLastClosedCandleOpenTimeUtc(
          new Date(),
          env.market.timeframe
        );
      const intervalMs =
        getIntervalMs(env.market.timeframe);

      if (!lastStoredOpenTime) {
        const candle =
          await retry(
            () => this.binance.getLastClosedCandle(
              env.market.symbol,
              env.market.timeframe
            ),
            5,
            60000
          );

        if (!candle) {
          logger.warn(
            "No candle returned"
          );

          return;
        }

        await this.candleRepository.insert(
          candle
        );

        logger.info(
          `Initial candle saved ${candle.openTime.toISOString()}`
        );

        return;
      }

      const normalizedLastStored =
        new Date(lastStoredOpenTime);
      const nextExpectedOpenTime =
        new Date(
          normalizedLastStored.getTime() +
          intervalMs
        );

      if (nextExpectedOpenTime > lastClosedOpenTime) {
        logger.info(
          "Collector found no new closed candles to ingest"
        );

        return;
      }

      if (!this.reconciliationService) {
        logger.warn(
          "Reconciliation service unavailable for automatic gap recovery"
        );

        return;
      }

      const recoveredCandles =
        await retry(
          () => this.reconciliationService!.recoverRange(
            nextExpectedOpenTime,
            lastClosedOpenTime
          ),
          5,
          60000
        );

      if (recoveredCandles.length === 0) {
        logger.warn(
          `Collector expected data between ${nextExpectedOpenTime.toISOString()} and ${lastClosedOpenTime.toISOString()} but recovered nothing`
        );
        return;
      }

      logger.info(
        `Collector recovered ${recoveredCandles.length} candle(s) from ${nextExpectedOpenTime.toISOString()} to ${lastClosedOpenTime.toISOString()}`
      );
    }
    catch (error) {
      logger.error(
        "Collector failed",
        error
      );
    }
  }
}
