import cron from "node-cron";
import { CandleRepository } from "../repositories/candle.repository";
import { BinanceClient } from "../data/binance.client";
import { env } from "../config/env";
import { logger } from "../shared/logger";
import { retry } from "../shared/retry.utils";

export class CandleCollectorWorker {
  constructor(
    private candleRepository: CandleRepository,
    private binance: BinanceClient
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
      const candles =
        await retry(
          () => this.binance.getLastClosedCandle(
            env.market.symbol,
            env.market.timeframe
          ),
          5, //retry
          60000 //backoff (lo que espera hasta volver a reintentar): 1 minuto
        );

      if (!candles) {
        logger.warn(
          "No candle returned"
        );

        return;
      }

      await this.candleRepository.insert(candles);

      logger.info(
        `Candle saved ${candles.openTime}`
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
