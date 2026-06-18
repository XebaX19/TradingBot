import { env } from "../config/env";
import { MarketDataService } from "../data/market-data.service";
import {
  BacktestEquityPoint,
  BacktestExecutionResult,
  BacktestTrade
} from "../models/backtest.model";
import { HybridStrategy } from "../strategy/hybrid.strategy";
import { TradeSimulator } from "./trade.simulator";

export interface BacktestEngineConfig {
  initialCapital: number;
}

export class BacktestEngine {
  constructor(
    private marketData: MarketDataService,
    private strategy: HybridStrategy,
    private simulator: TradeSimulator,
    private config: BacktestEngineConfig = {
      initialCapital:
        env.backtest.initialCapital
    }
  ) { }

  /**
   * Recorre el historico sin usar datos futuros para la evaluacion de la
   * senal. Si el sistema entra a una posicion, se avanza hasta la vela de
   * salida porque este motor asume una sola posicion abierta por vez.
   */
  async execute(
    from: Date,
    to: Date
  ): Promise<BacktestExecutionResult> {
    const candles =
      await this.marketData.getHourlyRange(
        from,
        to
      );
    const trades: BacktestTrade[] = [];
    const equityCurve: BacktestEquityPoint[] = [
      {
        timestamp: from,
        equity: this.config.initialCapital,
        drawdownPercent: 0,
        tradeNumber: 0
      }
    ];
    const warmupCandles =
      this.strategy.getRequiredHourlyHistory();
    let equity =
      this.config.initialCapital;
    let peakEquity =
      this.config.initialCapital;

    for (
      let i = warmupCandles;
      i < candles.length - 1;
      i++
    ) {
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
      peakEquity =
        Math.max(
          peakEquity,
          equity
        );

      equityCurve.push({
        timestamp:
          simulation.trade.exitTime,
        equity,
        drawdownPercent:
          peakEquity === 0
            ? 0
            : (
              (peakEquity - equity)
              /
              peakEquity
            )
            * 100,
        tradeNumber: trades.length
      });

      i =
        i +
        1 +
        simulation.exitIndexOffset;
    }

    return {
      trades,
      equityCurve
    };
  }
}
