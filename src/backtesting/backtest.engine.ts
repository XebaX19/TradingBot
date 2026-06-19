import { env } from "../config/env";
import { MarketDataService } from "../data/market-data.service";
import {
  BacktestEquityPoint,
  BacktestExecutionResult,
  BacktestTrade
} from "../models/backtest.model";
import { getIntervalMs } from "../shared/date.utils";
import { HybridStrategy } from "../strategy/hybrid.strategy";
import { BacktestDataValidatorService } from "./backtest-data-validator.service";
import { TradeSimulator } from "./trade.simulator";

export interface BacktestEngineConfig {
  initialCapital: number;
}

export class BacktestEngine {
  constructor(
    private marketData: MarketDataService,
    private strategy: HybridStrategy,
    private simulator: TradeSimulator,
    private dataValidator: BacktestDataValidatorService,
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
    const warmupCandles =
      this.strategy.getRequiredHourlyHistory();
    const warmupFrom =
      new Date(
        from.getTime() -
        (
          warmupCandles *
          getIntervalMs(env.market.timeframe)
        )
      );
    const candles =
      await this.marketData.getHourlyRange(
        warmupFrom,
        to
      );
    const dataQuality =
      this.dataValidator.validate(
        candles,
        warmupCandles
      );

    if (!dataQuality.isValid) {
      throw new Error(
        `Backtest dataset validation failed: ${dataQuality.issues.map(issue => issue.detail).join(" | ")}`
      );
    }

    const evaluationStartIndex =
      candles.findIndex(
        candle =>
          candle.openTime >= from
      );

    if (evaluationStartIndex === -1) {
      throw new Error(
        "Backtest dataset validation failed: requested period has no candles available for evaluation"
      );
    }

    if (
      evaluationStartIndex <
      warmupCandles
    ) {
      throw new Error(
        `Backtest dataset validation failed: requested period requires at least ${warmupCandles} warmup candles before ${from.toISOString()}`
      );
    }

    const trades: BacktestTrade[] = [];
    const equityCurve: BacktestEquityPoint[] = [
      {
        timestamp: from,
        equity: this.config.initialCapital,
        drawdownPercent: 0,
        tradeNumber: 0,
        pointType: "REALIZED"
      }
    ];
    let equity =
      this.config.initialCapital;
    let peakEquity =
      this.config.initialCapital;

    for (
      let i =
        Math.max(
          warmupCandles,
          evaluationStartIndex
        );
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

      for (const point of simulation.equityPoints) {
        peakEquity =
          Math.max(
            peakEquity,
            point.equity
          );

        equityCurve.push({
          ...point,
          drawdownPercent:
            peakEquity === 0
              ? 0
              : (
                (peakEquity - point.equity)
                /
                peakEquity
              ) * 100,
          tradeNumber: trades.length
        });
      }

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
            ) * 100,
        tradeNumber: trades.length,
        pointType: "REALIZED"
      });

      i =
        i +
        1 +
        simulation.exitIndexOffset;
    }

    return {
      trades,
      equityCurve,
      dataQuality,
      context: {
        strategyName:
          this.strategy.getStrategyName(),
        strategyParameters:
          this.strategy.getConfig(),
        backtestParameters: {
          initialCapital:
            this.config.initialCapital,
          ...this.simulator.getConfig()
        }
      }
    };
  }
}
