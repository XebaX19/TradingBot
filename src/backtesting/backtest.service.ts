import { env } from "../config/env";
import { BacktestResult } from "../models/backtest.model";
import { BacktestRepository } from "../repositories/backtest.repository";
import { HybridStrategy } from "../strategy/hybrid.strategy";
import { BacktestEngine } from "./backtest.engine";
import { BacktestMetricsService } from "./backtest-metrics.service";

export class BacktestService {
  constructor(
    private engine: BacktestEngine,
    private metrics: BacktestMetricsService,
    private strategy: HybridStrategy,
    private repository?: BacktestRepository,
    private config = {
      initialCapital:
        env.backtest.initialCapital
    }
  ) { }

  /**
   * Orquesta una corrida de backtest:
   * 1. engine -> genera trades y curva de equity
   * 2. metrics -> consolida el resumen cuantitativo
   * 3. repository -> persiste la corrida si existe una capa SQL conectada
   */
  async execute(
    from: Date,
    to: Date
  ): Promise<BacktestResult> {
    const execution =
      await this.engine.execute(
        from,
        to
      );

    const result =
      this.metrics.calculate(
        execution,
        from,
        to,
        this.config.initialCapital
      );

    if (this.repository) {
      await this.repository.saveRun(
        this.strategy.getStrategyName(),
        result
      );
    }

    return result;
  }
}
