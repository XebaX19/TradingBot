import { MarketDataService } from "../data/market-data.service";
import { HybridStrategy } from "../strategy/hybrid.strategy";
import { TradeSimulator } from "./trade.simulator";
import { BacktestTrade, BacktestResult } from "../models/backtest.model";

export class BacktestService {
  constructor(
    private marketData: MarketDataService,
    private strategy: HybridStrategy,
    private simulator: TradeSimulator
  ) { }

  async execute(
    from: Date,
    to: Date
  ) {
    const candles =
      await this.marketData.getHourlyRange(
        from,
        to
      );

    const trades: BacktestTrade[] = [];

    for (let i = 5000; i < candles.length; i++) {
      const history = candles.slice(0, i + 1);

      const signal =
        this.strategy.evaluate(
          history,
          this.marketData.buildDaily(history)
        );

      if (!signal) {
        continue;
      }

      const future = candles.slice(i + 1);

      const result =
        this.simulator.simulate(
          signal,
          future
        );

      if (result) {


        if (result) {
          const trade: BacktestTrade = {
            signal,
            entryTime: signal.timestamp,
            entryPrice: signal.entryPrice,
            exitTime: result.exitTime,
            exitPrice: result.exitPrice,
            result: result.result,
            profitPercent: result.profitPercent,
            exitReason: result.exitReason
          };

          trades.push(trade);
        }
      }
    }

    return this.calculateResult(
      trades,
      from,
      to
    );
  }

  private calculateResult(
    trades: BacktestTrade[],
    from: Date,
    to: Date
  ): BacktestResult {
    const totalTrades = trades.length;

    const wins =
      trades.filter(
        x => x.result === "WIN"
      ).length;

    const losses =
      trades.filter(
        x => x.result === "LOSS"
      ).length;

    const winRate = totalTrades === 0 ? 0 : (wins / totalTrades) * 100;

    const totalReturn =
      trades.reduce(
        (sum, trade) =>
          sum +
          (trade.profitPercent || 0),
        0
      );

    const averageWin =
      wins === 0
        ?
        0
        :
        trades
          .filter(x => x.result === "WIN")
          .reduce(
            (a, b) => a + (b.profitPercent || 0),
            0
          )
        /
        wins;

    const averageLoss =
      losses === 0
        ?
        0
        :
        trades
          .filter(x => x.result === "LOSS")
          .reduce(
            (a, b) => a + (b.profitPercent || 0),
            0
          )
        /
        losses;

    return {
      from,
      to,
      totalTrades,
      wins,
      losses,
      winRate,
      totalReturn,
      averageWin,
      averageLoss,
      trades
    };
  }
}
