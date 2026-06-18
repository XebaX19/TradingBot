import { SqlService } from "../database/sql.service";
import { BacktestResult, BacktestTrade } from "../models/backtest.model";

export class BacktestRepository {
  constructor(
    private sql: SqlService
  ) { }

  /**
   * Persiste el resumen de la corrida, su contexto cuantitativo y luego todos
   * los trades asociados.
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
          expectancy,
          average_holding_hours,
          exposure_time_percent,
          max_drawdown,
          max_consecutive_wins,
          max_consecutive_losses,
          strategy_parameters_json,
          backtest_parameters_json,
          dataset_quality_json
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
          @expectancy,
          @averageHoldingHours,
          @exposureTimePercent,
          @maxDrawdown,
          @maxConsecutiveWins,
          @maxConsecutiveLosses,
          @strategyParametersJson,
          @backtestParametersJson,
          @datasetQualityJson
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
          expectancy:
            result.expectancy,
          averageHoldingHours:
            result.averageHoldingHours,
          exposureTimePercent:
            result.exposureTimePercent,
          maxDrawdown:
            result.maxDrawdown,
          maxConsecutiveWins:
            result.maxConsecutiveWins,
          maxConsecutiveLosses:
            result.maxConsecutiveLosses,
          strategyParametersJson:
            JSON.stringify(result.context.strategyParameters),
          backtestParametersJson:
            JSON.stringify(result.context.backtestParameters),
          datasetQualityJson:
            JSON.stringify(result.dataQuality)
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
        holding_candles,
        holding_hours,
        mfe_percent,
        mae_percent,
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
        @holdingCandles,
        @holdingHours,
        @maxFavorableExcursionPercent,
        @maxAdverseExcursionPercent,
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
        holdingCandles:
          trade.holdingCandles,
        holdingHours:
          trade.holdingHours,
        maxFavorableExcursionPercent:
          trade.maxFavorableExcursionPercent,
        maxAdverseExcursionPercent:
          trade.maxAdverseExcursionPercent,
        result:
          trade.result,
        exitReason:
          trade.exitReason
      }
    );
  }
}
