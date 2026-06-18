import { SqlService } from "../database/sql.service";

export class ReconciliationRepository {
  constructor(
    private sql: SqlService
  ) { }

  async saveLog(data: any) {
    await this.sql.query(`
      INSERT INTO candle_reconciliation_log

      (
        execution_date,
        symbol,
        timeframe,
        process_status,
        candles_checked,
        candles_missing,
        candles_recovered,
        errors,
        details
      )

      VALUES

      (
        SYSUTCDATETIME(),
        @symbol,
        @timeframe,
        @status,
        @checked,
        @missing,
        @recovered,
        @errors,
        @details
      )
    `, data);
  }
}
