import { SqlService } from "../database/sql.service";
import { TradeSignal } from "../models/trade-signal.model";
import { logger } from "../shared/logger";

export class SignalRepository {
  constructor(
    private sql: SqlService
  ) { }

  async save(
    signal: TradeSignal
  ) {
    const exists =
      await this.exists(
        signal.signalId
      );

    if (exists) {
      logger.info(
        `Signal ${signal.signalId} already exists`
      );

      return;
    }

    await this.sql.query(`
      INSERT INTO strategy_signals
      (
        signal_id,
        symbol,
        strategy,
        type,
        side,
        entry_price,
        stop_loss,
        take_profit,
        stop_loss_percent,
        take_profit_percent,
        risk_reward,
        rsi,
        ema200,
        drop_percent,
        volume_ratio,
        reasons,
        signal_timestamp
      )
      VALUES
      (
        @signalId,
        @symbol,
        @strategy,
        @type,
        @side,
        @entryPrice,
        @stopLoss,
        @takeProfit,
        @stopLossPercent,
        @takeProfitPercent,
        @riskReward,
        @rsi,
        @ema200,
        @dropPercent,
        @volumeRatio,
        @reasons,
        @timestamp
      )
      `,
      {
        signalId: signal.signalId,
        symbol: signal.symbol,
        strategy: signal.strategy,
        type: signal.type,
        side: signal.side,
        entryPrice: signal.entryPrice,
        stopLoss: signal.stopLoss,
        takeProfit: signal.takeProfit,
        stopLossPercent: signal.risk.stopLossPercent,
        takeProfitPercent: signal.risk.takeProfitPercent,
        riskReward: signal.risk.riskReward,
        rsi: signal.indicators.rsi,
        ema200: signal.indicators.ema200,
        dropPercent: signal.indicators.dropPercent,
        volumeRatio: signal.indicators.volumeRatio,
        reasons: JSON.stringify(signal.reason),
        timestamp: signal.timestamp
      });
  }

  async exists(
    signalId: string
  ): Promise<boolean> {
    const result =
      await this.sql.query(`
        SELECT COUNT(*) total
        FROM strategy_signals
        WHERE signal_id = @signalId
        `,
        {
          signalId
        });

    return result.recordset[0].total > 0;
  }
}
