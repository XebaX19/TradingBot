import { env } from "../config/env";
import { MarketDataService } from "../data/market-data.service";
import {
  DatasetSplit,
  ValidationAssessment
} from "../models/optimization.model";
import {
  addUtcDays,
  startOfUtcDay
} from "../shared/date.utils";
import { HybridStrategy, HybridStrategyConfig } from "../strategy/hybrid.strategy";
import { BacktestEngine } from "./backtest.engine";
import { BacktestDataValidatorService } from "./backtest-data-validator.service";
import { BacktestMetricsService } from "./backtest-metrics.service";
import { BacktestService } from "./backtest.service";
import { TradeSimulator } from "./trade.simulator";

export interface StrategyValidationHooks {
  onStage?: (
    stage:
      | "training"
      | "validation"
      | "assessment"
  ) => void;
}

export class StrategyValidatorService {
  constructor(
    private marketData: MarketDataService,
    private metrics: BacktestMetricsService,
    private backtestConfig = {
      initialCapital: env.backtest.initialCapital
    }
  ) { }

  /**
   * Divide el dataset en orden cronologico para evitar leakage entre training
   * y validation. Nunca se mezclan velas futuras dentro del conjunto de ajuste.
   */
  async createDatasetSplit(
    from: Date,
    to: Date,
    splitRatio: number = 0.7
  ): Promise<DatasetSplit> {
    const candles =
      await this.marketData.getHourlyRange(
        from,
        to
      );

    if (candles.length < 2) {
      throw new Error(
        "Not enough candles to split dataset into training and validation"
      );
    }

    const boundedRatio =
      Math.min(
        Math.max(splitRatio, 0.1),
        0.9
      );
    const splitIndex =
      Math.floor(candles.length * boundedRatio) - 1;

    if (
      splitIndex < 0 ||
      splitIndex >= candles.length - 1
    ) {
      throw new Error(
        "Invalid split index generated for training and validation"
      );
    }

    const desiredValidationStart =
      addUtcDays(
        startOfUtcDay(
          candles[splitIndex].openTime
        ),
        1
      );
    const validationStartIndex =
      candles.findIndex(
        candle =>
          candle.openTime >=
          desiredValidationStart
      );

    if (
      validationStartIndex <= 0 ||
      validationStartIndex >= candles.length
    ) {
      throw new Error(
        "Unable to create a day-aligned training/validation split with the requested range"
      );
    }

    return {
      trainingFrom: candles[0].openTime,
      trainingTo:
        candles[validationStartIndex - 1].openTime,
      validationFrom:
        candles[validationStartIndex].openTime,
      validationTo: candles[candles.length - 1].openTime,
      splitRatio:
        validationStartIndex /
        candles.length,
      totalCandles: candles.length
    };
  }

  async validateParameters(
    parameters: HybridStrategyConfig,
    split: DatasetSplit,
    hooks?: StrategyValidationHooks
  ): Promise<ValidationAssessment> {
    hooks?.onStage?.("training");
    const training =
      await this.runBacktest(
        parameters,
        split.trainingFrom,
        split.trainingTo
      );
    hooks?.onStage?.("validation");
    const validation =
      await this.runBacktest(
        parameters,
        split.validationFrom,
        split.validationTo
      );
    hooks?.onStage?.("assessment");

    return this.assess(
      parameters,
      training,
      validation
    );
  }

  private async runBacktest(
    parameters: HybridStrategyConfig,
    from: Date,
    to: Date
  ) {
    const strategy =
      new HybridStrategy(parameters);
    const simulator =
      new TradeSimulator({
        maxHoldingCandles:
          parameters.maxHoldingCandles,
        commissionPercent:
          env.backtest.commissionPercent,
        slippagePercent:
          env.backtest.slippagePercent,
        positionSizePercent:
          env.backtest.positionSizePercent,
        minTradeNotional:
          env.backtest.minTradeNotional,
        quantityStep:
          env.backtest.quantityStep
      });
    const engine =
      new BacktestEngine(
        this.marketData,
        strategy,
        simulator,
        new BacktestDataValidatorService(),
        {
          initialCapital:
            this.backtestConfig.initialCapital
        }
      );
    const service =
      new BacktestService(
        engine,
        this.metrics,
        strategy,
        undefined,
        {
          initialCapital:
            this.backtestConfig.initialCapital
        }
      );

    return service.execute(
      from,
      to
    );
  }

  /**
   * Convierte training/validation en una lectura de robustez utilizable.
   *
   * Punto critico:
   * El criterio no prioriza solo retorno. Penaliza degradacion fuerte, aumento
   * de drawdown y una validacion con muy pocas operaciones.
   */
  private assess(
    parameters: HybridStrategyConfig,
    training: Awaited<ReturnType<BacktestService["execute"]>>,
    validation: Awaited<ReturnType<BacktestService["execute"]>>
  ): ValidationAssessment {
    const returnDeltaPercent =
      validation.returnPercent -
      training.returnPercent;
    const returnDegradationPercent =
      this.calculateDegradationPercent(
        training.returnPercent,
        validation.returnPercent
      );
    const drawdownDeltaPercent =
      validation.maxDrawdown -
      training.maxDrawdown;
    const tradeCountDeltaPercent =
      this.calculateDegradationPercent(
        training.totalTrades,
        validation.totalTrades
      );
    const profitFactorDeltaPercent =
      this.calculateDegradationPercent(
        this.normalizeProfitFactor(
          training.profitFactor
        ),
        this.normalizeProfitFactor(
          validation.profitFactor
        )
      );
    const expectancyDeltaPercent =
      this.calculateDegradationPercent(
        training.expectancy,
        validation.expectancy
      );
    const trainingReturnOverDrawdown =
      this.calculateReturnOverDrawdown(
        training.returnPercent,
        training.maxDrawdown
      );
    const validationReturnOverDrawdown =
      this.calculateReturnOverDrawdown(
        validation.returnPercent,
        validation.maxDrawdown
      );
    const overfittingDetected =
      training.returnPercent > 0 &&
      validation.returnPercent < 0 &&
      returnDegradationPercent > 100;
    const robustnessFlags =
      this.buildRobustnessFlags(
        training,
        validation,
        returnDegradationPercent,
        drawdownDeltaPercent,
        tradeCountDeltaPercent,
        profitFactorDeltaPercent,
        expectancyDeltaPercent,
        overfittingDetected
      );
    const consistencyScore =
      this.calculateConsistencyScore(
        returnDegradationPercent,
        drawdownDeltaPercent,
        tradeCountDeltaPercent,
        profitFactorDeltaPercent,
        expectancyDeltaPercent,
        trainingReturnOverDrawdown,
        validationReturnOverDrawdown,
        robustnessFlags
      );

    const robustnessScore =
      this.calculateRobustnessScore(
        training,
        validation,
        returnDegradationPercent,
        drawdownDeltaPercent,
        tradeCountDeltaPercent,
        profitFactorDeltaPercent,
        expectancyDeltaPercent,
        validationReturnOverDrawdown,
        consistencyScore,
        overfittingDetected,
        robustnessFlags
      );

    const isRobust =
      !overfittingDetected &&
      !robustnessFlags.some(
        flag =>
          flag === "NEGATIVE_VALIDATION_RETURN" ||
          flag === "LOW_VALIDATION_TRADES" ||
          flag === "RETURN_DEGRADATION_TOO_HIGH" ||
          flag === "VALIDATION_PROFIT_FACTOR_BELOW_1" ||
          flag === "NEGATIVE_VALIDATION_EXPECTANCY"
      ) &&
      consistencyScore >= 55;

    return {
      parameters,
      training,
      validation,
      returnDeltaPercent,
      returnDegradationPercent,
      drawdownDeltaPercent,
      tradeCountDeltaPercent,
      profitFactorDeltaPercent,
      expectancyDeltaPercent,
      trainingReturnOverDrawdown,
      validationReturnOverDrawdown,
      consistencyScore,
      robustnessScore,
      parameterStabilityScore: 0,
      overfittingDetected,
      isRobust,
      robustnessFlags
    };
  }

  private calculateDegradationPercent(
    baseline: number,
    candidate: number
  ) {
    if (baseline === 0) {
      return candidate === 0 ? 0 : 100;
    }

    return (
      (baseline - candidate)
      /
      Math.abs(baseline)
    )
    *
    100;
  }

  private calculateRobustnessScore(
    training: Awaited<ReturnType<BacktestService["execute"]>>,
    validation: Awaited<ReturnType<BacktestService["execute"]>>,
    returnDegradationPercent: number,
    drawdownDeltaPercent: number,
    tradeCountDeltaPercent: number,
    profitFactorDeltaPercent: number,
    expectancyDeltaPercent: number,
    validationReturnOverDrawdown: number,
    consistencyScore: number,
    overfittingDetected: boolean,
    robustnessFlags: string[]
  ) {
    const trainingPerformance =
      this.calculateReturnOverDrawdown(
        training.returnPercent,
        training.maxDrawdown
      );
    const validationPerformance =
      validationReturnOverDrawdown;
    const degradationPenalty =
      Math.max(0, returnDegradationPercent) * 0.6;
    const drawdownPenalty =
      Math.max(0, drawdownDeltaPercent) * 1.5;
    const tradePenalty =
      validation.totalTrades < 3
        ? 15
        : Math.max(0, tradeCountDeltaPercent - 50) * 0.1;
    const profitFactorPenalty =
      Math.max(0, profitFactorDeltaPercent) * 0.2;
    const expectancyPenalty =
      Math.max(0, expectancyDeltaPercent) * 0.15;
    const robustnessFlagPenalty =
      robustnessFlags.length * 4;
    const overfittingPenalty =
      overfittingDetected ? 50 : 0;

    return (
      (validationPerformance * 20) +
      (trainingPerformance * 8) +
      (consistencyScore * 0.6) -
      degradationPenalty -
      drawdownPenalty -
      tradePenalty -
      profitFactorPenalty -
      expectancyPenalty -
      robustnessFlagPenalty -
      overfittingPenalty
    );
  }

  private calculateReturnOverDrawdown(
    returnPercent: number,
    drawdownPercent: number
  ) {
    return returnPercent / Math.max(1, drawdownPercent);
  }

  private normalizeProfitFactor(
    profitFactor: number
  ) {
    if (!Number.isFinite(profitFactor)) {
      return 10;
    }

    return profitFactor;
  }

  private buildRobustnessFlags(
    training: Awaited<ReturnType<BacktestService["execute"]>>,
    validation: Awaited<ReturnType<BacktestService["execute"]>>,
    returnDegradationPercent: number,
    drawdownDeltaPercent: number,
    tradeCountDeltaPercent: number,
    profitFactorDeltaPercent: number,
    expectancyDeltaPercent: number,
    overfittingDetected: boolean
  ) {
    const flags: string[] = [];
    const minimumValidationTrades =
      Math.max(
        3,
        Math.floor(training.totalTrades * 0.2)
      );

    if (validation.returnPercent < 0) {
      flags.push(
        "NEGATIVE_VALIDATION_RETURN"
      );
    }

    if (
      validation.totalTrades <
      minimumValidationTrades
    ) {
      flags.push(
        "LOW_VALIDATION_TRADES"
      );
    }

    if (returnDegradationPercent > 60) {
      flags.push(
        "RETURN_DEGRADATION_TOO_HIGH"
      );
    }

    if (drawdownDeltaPercent > 10) {
      flags.push(
        "DRAWDOWN_EXPANSION"
      );
    }

    if (validation.profitFactor < 1) {
      flags.push(
        "VALIDATION_PROFIT_FACTOR_BELOW_1"
      );
    }

    if (profitFactorDeltaPercent > 50) {
      flags.push(
        "PROFIT_FACTOR_DEGRADATION"
      );
    }

    if (validation.expectancy <= 0) {
      flags.push(
        "NEGATIVE_VALIDATION_EXPECTANCY"
      );
    }

    if (expectancyDeltaPercent > 50) {
      flags.push(
        "EXPECTANCY_DEGRADATION"
      );
    }

    if (overfittingDetected) {
      flags.push(
        "OVERFITTING_DETECTED"
      );
    }

    return flags;
  }

  private calculateConsistencyScore(
    returnDegradationPercent: number,
    drawdownDeltaPercent: number,
    tradeCountDeltaPercent: number,
    profitFactorDeltaPercent: number,
    expectancyDeltaPercent: number,
    trainingReturnOverDrawdown: number,
    validationReturnOverDrawdown: number,
    robustnessFlags: string[]
  ) {
    const returnPenalty =
      Math.max(0, returnDegradationPercent) * 0.35;
    const drawdownPenalty =
      Math.max(0, drawdownDeltaPercent) * 1.2;
    const tradePenalty =
      Math.max(0, tradeCountDeltaPercent) * 0.1;
    const profitFactorPenalty =
      Math.max(0, profitFactorDeltaPercent) * 0.15;
    const expectancyPenalty =
      Math.max(0, expectancyDeltaPercent) * 0.1;
    const riskAdjustedGapPenalty =
      Math.max(
        0,
        (
          trainingReturnOverDrawdown -
          validationReturnOverDrawdown
        ) * 12
      );
    const flagPenalty =
      robustnessFlags.length * 5;

    return Math.max(
      0,
      100 -
      returnPenalty -
      drawdownPenalty -
      tradePenalty -
      profitFactorPenalty -
      expectancyPenalty -
      riskAdjustedGapPenalty -
      flagPenalty
    );
  }
}
