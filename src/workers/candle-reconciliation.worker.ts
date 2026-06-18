import cron from "node-cron";
import { env } from "../config/env";
import { CandleReconciliationService } from "../data/reconciliation.service";
import { ReconciliationRepository } from "../repositories/reconciliation.repository";
import { CandleRepository } from "../repositories/candle.repository";
import { logger } from "../shared/logger";
import {
  clampToLastClosedCandleUtc,
  endOfUtcDay,
  startOfUtcDay
} from "../shared/date.utils";

export class CandleReconciliationWorker {
  constructor(
    private reconciliationService: CandleReconciliationService,
    private reconciliationRepository: ReconciliationRepository,
    private candleRepository?: CandleRepository
  ) { }

  start() {
    /*
    02:00 UTC todos los días
    */

    cron.schedule(
      "0 2 * * *",
      async () => {
        await this.execute();
      },
      {
        timezone: "UTC"
      }
    );

    logger.info(
      "Candle reconciliation worker started"
    );
  }

  private async execute() {
    try {
      const { from, to } =
        await this.resolveReconciliationWindow();

      logger.info(
        `
Candle reconciliation started
Execution: ${new Date().toISOString()}
Period: ${from.toISOString()} - ${to.toISOString()}
`
      );

      const result = await this.reconciliationService.execute(
        from,
        to
      );

      await this.reconciliationRepository.saveLog({
        symbol: env.market.symbol,
        timeframe: env.market.timeframe,
        status: "SUCCESS",
        checked: result.checked,
        missing: result.missing,
        recovered: result.recovered,
        errors: result.invalid + result.duplicates,
        details: JSON.stringify(result)
      });

      logger.info(
        "Reconciliation finished"
      );
    }
    catch (error) {
      logger.error(
        "Reconciliation worker failed",
        error
      );
    }
  }

  /**
   * Si detectamos que el dataset esta retrasado respecto de la ultima vela
   * cerrada, reconciliamos todos los dias impactados completos. No validamos
   * solo el hueco puntual porque eso podria dejar faltantes mas viejos dentro
   * del mismo dia sin revisar.
   */
  private async resolveReconciliationWindow() {
    const now =
      new Date();
    const lastClosedOpenTime =
      clampToLastClosedCandleUtc(
        now,
        now,
        env.market.timeframe
      );
    const defaultDay =
      new Date(lastClosedOpenTime);

    defaultDay.setUTCDate(
      defaultDay.getUTCDate() - 1
    );

    if (!this.candleRepository) {
      return {
        from: startOfUtcDay(defaultDay),
        to: endOfUtcDay(
          defaultDay,
          env.market.timeframe
        )
      };
    }

    const lastStoredOpenTime =
      await this.candleRepository.getLastCandle(
        env.market.symbol,
        env.market.timeframe
      );

    if (!lastStoredOpenTime) {
      return {
        from: startOfUtcDay(defaultDay),
        to: endOfUtcDay(
          defaultDay,
          env.market.timeframe
        )
      };
    }

    const normalizedLastStored =
      new Date(lastStoredOpenTime);

    if (normalizedLastStored >= lastClosedOpenTime) {
      return {
        from: startOfUtcDay(defaultDay),
        to: endOfUtcDay(
          defaultDay,
          env.market.timeframe
        )
      };
    }

    return {
      from: startOfUtcDay(
        normalizedLastStored
      ),
      to: lastClosedOpenTime
    };
  }
}
