import {
  BacktestEquityPoint,
  BacktestResult,
  BacktestRunSummary,
  BacktestTrade
} from "../models/backtest.model";

export class BacktestMetricsService {
  calculate(
    execution: {
      trades: BacktestTrade[];
      equityCurve: BacktestEquityPoint[];
      dataQuality: BacktestResult["dataQuality"];
      context: BacktestResult["context"];
    },
    from: Date,
    to: Date,
    initialCapital: number
  ): BacktestResult {
    const summary =
      this.buildSummary(
        execution.trades,
        execution.equityCurve,
        from,
        to,
        initialCapital
      );

    return {
      ...summary,
      dataQuality:
        execution.dataQuality,
      context:
        execution.context,
      equityCurve:
        execution.equityCurve,
      trades:
        execution.trades
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
    const averageHoldingHours =
      totalTrades === 0
        ? 0
        : trades.reduce(
          (sum, trade) =>
            sum + trade.holdingHours,
          0
        ) / totalTrades;
    const totalHours =
      Math.max(
        1,
        (
          to.getTime() - from.getTime()
        ) / (60 * 60 * 1000)
      );
    const exposureTimePercent =
      (
        trades.reduce(
          (sum, trade) =>
            sum + trade.holdingHours,
          0
        ) / totalHours
      ) * 100;

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
      expectancy:
        totalTrades === 0
          ? 0
          : netProfit / totalTrades,
      averageHoldingHours,
      exposureTimePercent,
      maxDrawdown:
        this.calculateMaxDrawdown(equityCurve),
      maxConsecutiveWins:
        this.calculateMaxConsecutive(
          trades,
          "WIN"
        ),
      maxConsecutiveLosses:
        this.calculateMaxConsecutive(
          trades,
          "LOSS"
        ),
      bestTrade:
        this.getBestTrade(trades),
      worstTrade:
        this.getWorstTrade(trades)
    };
  }

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

  private calculateMaxConsecutive(
    trades: BacktestTrade[],
    result: "WIN" | "LOSS"
  ) {
    let best = 0;
    let current = 0;

    for (const trade of trades) {
      if (trade.result === result) {
        current += 1;
        best =
          Math.max(best, current);
      } else {
        current = 0;
      }
    }

    return best;
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
