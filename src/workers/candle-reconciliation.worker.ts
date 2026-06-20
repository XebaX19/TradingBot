import cron from "node-cron";
import { env } from "../config/env";
import { CandleReconciliationService } from "../data/reconciliation.service";
import { ReconciliationRepository } from "../repositories/reconciliation.repository";
import { CandleRepository } from "../repositories/candle.repository";
import { logger } from "../shared/logger";
import {
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
   * Regla operativa:
   * la reconciliacion automatica diaria valida siempre el dia UTC anterior
   * completo. No incluye velas del dia actual aunque ya esten cerradas.
   */
  private async resolveReconciliationWindow() {
    const now =
      new Date();
    const defaultDay =
      new Date(now);

    defaultDay.setUTCDate(
      defaultDay.getUTCDate() - 1
    );
    const defaultFrom =
      startOfUtcDay(defaultDay);
    const defaultTo =
      endOfUtcDay(
        defaultDay,
        env.market.timeframe
      );

    if (!this.candleRepository) {
      return {
        from: defaultFrom,
        to: defaultTo
      };
    }

    return {
      from: defaultFrom,
      to: defaultTo
    };
  }
}
