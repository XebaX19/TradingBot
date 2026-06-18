import {
  BacktestEquityPoint,
  BacktestResult,
  BacktestRunSummary,
  BacktestTrade
} from "../models/backtest.model";

export class BacktestMetricsService {
  /**
   * Consolida el resultado de una corrida a partir de los trades ya
   * simulados y de la curva de equity realizada.
   */
  calculate(
    trades: BacktestTrade[],
    equityCurve: BacktestEquityPoint[],
    from: Date,
    to: Date,
    initialCapital: number
  ): BacktestResult {
    const summary =
      this.buildSummary(
        trades,
        equityCurve,
        from,
        to,
        initialCapital
      );

    return {
      ...summary,
      equityCurve,
      trades
    };
  }

  private buildSummary(
    trades: BacktestTrade[],
    equityCurve: BacktestEquityPoint[],
    from: Date,
    to: Date,
    initialCapital: number
  ): BacktestRunSummary {
    const totalTrades =
      trades.length;
    const wins =
      trades.filter(
        trade => trade.netPnl > 0
      ).length;
    const losses =
      trades.filter(
        trade => trade.netPnl < 0
      ).length;
    const grossProfit =
      trades
        .filter(trade => trade.netPnl > 0)
        .reduce(
          (sum, trade) =>
            sum + trade.netPnl,
          0
        );
    const grossLoss =
      Math.abs(
        trades
          .filter(trade => trade.netPnl < 0)
          .reduce(
            (sum, trade) =>
              sum + trade.netPnl,
            0
          )
      );
    const netProfit =
      trades.reduce(
        (sum, trade) =>
          sum + trade.netPnl,
        0
      );
    const finalCapital =
      initialCapital + netProfit;
    const winRate =
      totalTrades === 0
        ? 0
        : (wins / totalTrades) * 100;
    const profitFactor =
      grossLoss === 0
        ? (grossProfit > 0 ? Number.POSITIVE_INFINITY : 0)
        : grossProfit / grossLoss;
    const averageWin =
      wins === 0
        ? 0
        : grossProfit / wins;
    const averageLoss =
      losses === 0
        ? 0
        : grossLoss / losses;

    return {
      from,
      to,
      initialCapital,
      finalCapital,
      netProfit,
      returnPercent:
        initialCapital === 0
          ? 0
          : (netProfit / initialCapital) * 100,
      totalTrades,
      wins,
      losses,
      winRate,
      profitFactor,
      averageWin,
      averageLoss,
      maxDrawdown:
        this.calculateMaxDrawdown(equityCurve),
      bestTrade:
        this.getBestTrade(trades),
      worstTrade:
        this.getWorstTrade(trades)
    };
  }

  /**
   * El drawdown se mide sobre la curva de equity realizada ya almacenada por el
   * engine. Asi se evita recalcular picos y valles a partir de los trades.
   */
  private calculateMaxDrawdown(
    equityCurve: BacktestEquityPoint[]
  ) {
    return equityCurve.reduce(
      (maxDrawdown, point) =>
        point.drawdownPercent > maxDrawdown
          ? point.drawdownPercent
          : maxDrawdown,
      0
    );
  }

  private getBestTrade(
    trades: BacktestTrade[]
  ) {
    if (trades.length === 0) {
      return null;
    }

    return trades.reduce(
      (best, current) =>
        current.netPnl > best.netPnl
          ? current
          : best
    );
  }

  private getWorstTrade(
    trades: BacktestTrade[]
  ) {
    if (trades.length === 0) {
      return null;
    }

    return trades.reduce(
      (worst, current) =>
        current.netPnl < worst.netPnl
          ? current
          : worst
    );
  }
}
