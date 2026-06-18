import { SqlService } from "../database/sql.service";
import { BacktestResult, BacktestTrade } from "../models/backtest.model";

export class BacktestRepository {
  constructor(
    private sql: SqlService
  ) { }

  /**
   * Persiste el resumen de la corrida y luego todos los trades asociados.
   */
  async saveRun(
    strategy: string,
    result: BacktestResult
  ) {
    const runInsert =
      await this.sql.query(
        `
        INSERT INTO backtest_runs
        (
          strategy,
          period_from,
          period_to,
          initial_capital,
          final_capital,
          net_profit,
          return_percent,
          total_trades,
          wins,
          losses,
          win_rate,
          profit_factor,
          average_win,
          average_loss,
          max_drawdown
        )
        OUTPUT INSERTED.id AS id
        VALUES
        (
          @strategy,
          @from,
          @to,
          @initialCapital,
          @finalCapital,
          @netProfit,
          @returnPercent,
          @totalTrades,
          @wins,
          @losses,
          @winRate,
          @profitFactor,
          @averageWin,
          @averageLoss,
          @maxDrawdown
        )
        `,
        {
          strategy,
          from: result.from,
          to: result.to,
          initialCapital:
            result.initialCapital,
          finalCapital:
            result.finalCapital,
          netProfit:
            result.netProfit,
          returnPercent:
            result.returnPercent,
          totalTrades:
            result.totalTrades,
          wins: result.wins,
          losses: result.losses,
          winRate: result.winRate,
          profitFactor:
            Number.isFinite(result.profitFactor)
              ? result.profitFactor
              : null,
          averageWin:
            result.averageWin,
          averageLoss:
            result.averageLoss,
          maxDrawdown:
            result.maxDrawdown
        }
      );

    const backtestRunId =
      runInsert.recordset[0].id as number;

    for (const trade of result.trades) {
      await this.saveTrade(
        backtestRunId,
        trade
      );
    }

    return backtestRunId;
  }

  private async saveTrade(
    backtestRunId: number,
    trade: BacktestTrade
  ) {
    await this.sql.query(
      `
      INSERT INTO backtest_trades
      (
        backtest_run_id,
        signal_id,
        symbol,
        entry_time,
        entry_price,
        exit_time,
        exit_price,
        quantity,
        position_size,
        gross_pnl,
        net_pnl,
        fees_paid,
        profit_percent,
        equity_before,
        equity_after,
        result,
        exit_reason
      )
      VALUES
      (
        @backtestRunId,
        @signalId,
        @symbol,
        @entryTime,
        @entryPrice,
        @exitTime,
        @exitPrice,
        @quantity,
        @positionSize,
        @grossPnl,
        @netPnl,
        @feesPaid,
        @profitPercent,
        @equityBefore,
        @equityAfter,
        @result,
        @exitReason
      )
      `,
      {
        backtestRunId,
        signalId:
          trade.signal.signalId,
        symbol:
          trade.signal.symbol,
        entryTime:
          trade.entryTime,
        entryPrice:
          trade.entryPrice,
        exitTime:
          trade.exitTime,
        exitPrice:
          trade.exitPrice,
        quantity:
          trade.quantity,
        positionSize:
          trade.positionSize,
        grossPnl:
          trade.grossPnl,
        netPnl:
          trade.netPnl,
        feesPaid:
          trade.feesPaid,
        profitPercent:
          trade.profitPercent,
        equityBefore:
          trade.equityBefore,
        equityAfter:
          trade.equityAfter,
        result:
          trade.result,
        exitReason:
          trade.exitReason
      }
    );
  }
}
