import cron from "node-cron";
import { CandleReconciliationService } from "../data/reconciliation.service";
import { ReconciliationRepository } from "../repositories/reconciliation.repository";
import { logger } from "../shared/logger";

export class CandleReconciliationWorker {
  constructor(
    private reconciliationService: CandleReconciliationService,
    private reconciliationRepository: ReconciliationRepository
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
      const today = new Date();
      const yesterday = new Date(today);

      yesterday.setUTCDate(yesterday.getUTCDate() - 1);

      const from = new Date(yesterday);
      from.setUTCHours(0, 0, 0, 0);

      const to = new Date(yesterday);
      to.setUTCHours(23, 0, 0, 0);

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
        symbol: process.env.SYMBOL,
        timeframe: process.env.TIMEFRAME,
        status: "SUCCESS",
        checked: result.checked,
        missing: result.missing,
        recovered: result.recovered,
        errors: 0,
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
}
