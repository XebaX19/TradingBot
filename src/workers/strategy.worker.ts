import cron from "node-cron";
import { OrderExecutorService } from "../execution/order-executor.service";
import { MarketDataService } from "../data/market-data.service";
import { HybridStrategy } from "../strategy/hybrid.strategy";
import { logger } from "../shared/logger";
import { SignalRepository } from "../repositories/signal.repository";

export class StrategyWorker {
  constructor(
    private marketData: MarketDataService,
    private strategy: HybridStrategy,
    private signalRepository: SignalRepository,
    private orderExecutor?: OrderExecutorService
  ) { }

  start() {
    /*
    Ejecuta 10 minutos
    después de cada cierre de vela
    
    Ej:
    
    10:10
    11:10
    12:10
    */
    cron.schedule(
      "10 * * * *",
      async () => {
        await this.execute();
      },
      {
        timezone: "UTC"
      }
    );

    logger.info(
      "Strategy worker started"
    );
  }

  private async execute() {
    try {
      logger.info(
        "Running strategy evaluation"
      );

      const hourly =
        await this.marketData.getHourlyCandles(
          5000
        );

      const daily =
        await this.marketData.getDailyCandles(
          250
        );

      const signal =
        this.strategy.evaluate(
          hourly,
          daily
        );

      if (!signal) {
        logger.info(
          "No signal generated"
        );

        return;
      }

      await this.signalRepository.save(
        signal
      );

      if (this.orderExecutor) {
        await this.orderExecutor.handleSignal(
          signal
        );
      }

      logger.info(
        `Signal saved ${signal.signalId}`
      );
    }
    catch (error) {
      logger.error(
        "Strategy execution failed",
        error
      );
    }
  }
}
