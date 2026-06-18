import { env } from "../config/env";
import { MarketDataService } from "../data/market-data.service";
import {
  BacktestResult,
  BacktestTrade
} from "../models/backtest.model";
import { HybridStrategy } from "../strategy/hybrid.strategy";
import {
  SimulatedTradeResult,
  TradeSimulator
} from "./trade.simulator";

export class BacktestService {
  constructor(
    private marketData: MarketDataService,
    private strategy: HybridStrategy,
    private simulator: TradeSimulator,
    private config = {
      initialCapital:
        env.backtest.initialCapital
    }
  ) { }

  /**
   * Ejecuta la estrategia vela por vela sin usar informacion futura para la
   * senal. Una vez que entra a mercado, se salta hasta la vela de salida para
   * evitar posiciones superpuestas en un sistema pensado para una sola posicion.
   */
  async execute(
    from: Date,
    to: Date
  ): Promise<BacktestResult> {
    const candles =
      await this.marketData.getHourlyRange(
        from,
        to
      );

    const trades: BacktestTrade[] = [];
    let equity =
      this.config.initialCapital;

    // 5000 horas cubren el warmup minimo para derivar EMA200 diaria desde 1h.
    for (let i = 5000; i < candles.length - 1; i++) {
      const history =
        candles.slice(
          0,
          i + 1
        );

      const signal =
        this.strategy.evaluate(
          history,
          this.marketData.buildDaily(history)
        );

      if (!signal) {
        continue;
      }

      const simulation =
        this.simulator.simulate(
          signal,
          candles.slice(i + 1),
          equity
        );

      if (!simulation) {
        continue;
      }

      trades.push(simulation.trade);
      equity =
        simulation.trade.equityAfter;

      // Saltamos hasta la vela donde cierra la posicion para no abrir
      // multiples trades superpuestos con el mismo capital.
      i =
        i +
        1 +
        simulation.exitIndexOffset;
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
      this.config.initialCapital +
      netProfit;
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
      initialCapital:
        this.config.initialCapital,
      finalCapital,
      netProfit,
      returnPercent:
        this.config.initialCapital === 0
          ? 0
          : (netProfit / this.config.initialCapital) * 100,
      totalTrades,
      wins,
      losses,
      winRate,
      profitFactor,
      averageWin,
      averageLoss,
      maxDrawdown:
        this.calculateMaxDrawdown(trades),
      bestTrade:
        this.getBestTrade(trades),
      worstTrade:
        this.getWorstTrade(trades),
      trades
    };
  }

  /**
   * El drawdown se calcula sobre equity realizada trade a trade. No usamos
   * mark-to-market intrabar porque el dataset actual es OHLCV horario.
   */
  private calculateMaxDrawdown(
    trades: BacktestTrade[]
  ) {
    let peak =
      this.config.initialCapital;
    let maxDrawdown = 0;

    for (const trade of trades) {
      if (trade.equityAfter > peak) {
        peak =
          trade.equityAfter;
      }

      const drawdown =
        peak === 0
          ? 0
          : (
            (peak - trade.equityAfter)
            /
            peak
          )
          *
          100;

      if (drawdown > maxDrawdown) {
        maxDrawdown =
          drawdown;
      }
    }

    return maxDrawdown;
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
