import { StrategyOptimizerService } from "./strategy-optimizer.service";
import {
  OptimizationResult,
  StrategyParameterGrid,
  ValidationAssessment
} from "../models/optimization.model";

export interface WalkForwardWindow {
  trainingFrom: Date;
  trainingTo: Date;
  validationFrom: Date;
  validationTo: Date;
  index: number;
}

export interface WalkForwardResult {
  windows: Array<{
    window: WalkForwardWindow;
    optimization: OptimizationResult;
    winner: ValidationAssessment | null;
  }>;
  averageValidationReturn: number;
  averageValidationDrawdown: number;
  averageValidationConsistencyScore: number;
  averageValidationDegradationPercent: number;
  robustWindowRatePercent: number;
  robustWindows: number;
  totalWindows: number;
  parameterConsistency: {
    dropPercent: number[];
    rsiLimit: number[];
    volumeMultiplier: number[];
    takeProfitPercent: number[];
    stopLossPercent: number[];
  };
  overallAssessment: "ROBUST" | "MIXED" | "WEAK";
}

export interface WalkForwardHooks {
  onWindowEvaluated?: (
    current: number,
    total: number,
    window: WalkForwardWindow,
    optimization: OptimizationResult
  ) => void;
}

export class WalkForwardService {
  constructor(
    private optimizer: StrategyOptimizerService
  ) { }

  /**
   * Ejecuta multiples ventanas temporales secuenciales para no depender de un
   * unico split fijo de training/validation.
   */
  async run(
    from: Date,
    to: Date,
    grid: StrategyParameterGrid,
    trainDays: number,
    validationDays: number,
    stepDays: number,
    hooks?: WalkForwardHooks
  ): Promise<WalkForwardResult> {
    const windows =
      this.buildWindows(
        from,
        to,
        trainDays,
        validationDays,
        stepDays
      );
    const results: WalkForwardResult["windows"] = [];

    for (let i = 0; i < windows.length; i++) {
      const window =
        windows[i];
      const optimization =
        await this.optimizer.optimize(
          window.trainingFrom,
          window.validationTo,
          grid,
          this.calculateWindowSplitRatio(window)
        );

      results.push({
        window,
        optimization,
        winner: optimization.bestCandidate
      });
      hooks?.onWindowEvaluated?.(
        i + 1,
        windows.length,
        window,
        optimization
      );
    }

    const winners =
      results
        .map(item => item.winner)
        .filter(
          (winner): winner is ValidationAssessment =>
            winner !== null
        );

    return {
      windows: results,
      averageValidationReturn:
        winners.length === 0
          ? 0
          : winners.reduce(
            (sum, winner) =>
              sum + winner.validation.returnPercent,
            0
          ) / winners.length,
      averageValidationDrawdown:
        winners.length === 0
          ? 0
          : winners.reduce(
            (sum, winner) =>
              sum + winner.validation.maxDrawdown,
            0
          ) / winners.length,
      averageValidationConsistencyScore:
        winners.length === 0
          ? 0
          : winners.reduce(
            (sum, winner) =>
              sum + winner.consistencyScore,
            0
          ) / winners.length,
      averageValidationDegradationPercent:
        winners.length === 0
          ? 0
          : winners.reduce(
            (sum, winner) =>
              sum + winner.returnDegradationPercent,
            0
          ) / winners.length,
      robustWindowRatePercent:
        results.length === 0
          ? 0
          : (
            winners.filter(
              winner => winner.isRobust
            ).length / results.length
          ) * 100,
      robustWindows:
        winners.filter(winner => winner.isRobust).length,
      totalWindows: results.length,
      parameterConsistency:
        this.summarizeWinningParameters(
          winners
        ),
      overallAssessment:
        this.classifyOverallAssessment(
          results.length,
          winners
        )
    };
  }

  private buildWindows(
    from: Date,
    to: Date,
    trainDays: number,
    validationDays: number,
    stepDays: number
  ) {
    const oneDayMs =
      24 * 60 * 60 * 1000;
    const windows: WalkForwardWindow[] = [];
    let cursor =
      from.getTime();
    let index = 1;

    while (true) {
      const trainingFrom =
        new Date(cursor);
      const trainingTo =
        new Date(
          cursor +
          (trainDays * oneDayMs) -
          oneDayMs
        );
      const validationFrom =
        new Date(trainingTo.getTime() + oneDayMs);
      const validationTo =
        new Date(
          validationFrom.getTime() +
          (validationDays * oneDayMs) -
          oneDayMs
        );

      if (validationTo > to) {
        break;
      }

      windows.push({
        trainingFrom,
        trainingTo,
        validationFrom,
        validationTo,
        index
      });

      cursor += stepDays * oneDayMs;
      index += 1;
    }

    return windows;
  }

  private calculateWindowSplitRatio(
    window: WalkForwardWindow
  ) {
    const trainingMs =
      window.trainingTo.getTime() -
      window.trainingFrom.getTime();
    const totalMs =
      window.validationTo.getTime() -
      window.trainingFrom.getTime();

    return totalMs <= 0
      ? 0.7
      : trainingMs / totalMs;
  }

  private summarizeWinningParameters(
    winners: ValidationAssessment[]
  ) {
    return {
      dropPercent:
        this.getUniqueSorted(
          winners.map(
            winner =>
              winner.parameters.dropPercent
          )
        ),
      rsiLimit:
        this.getUniqueSorted(
          winners.map(
            winner =>
              winner.parameters.rsiLimit
          )
        ),
      volumeMultiplier:
        this.getUniqueSorted(
          winners.map(
            winner =>
              winner.parameters.volumeMultiplier
          )
        ),
      takeProfitPercent:
        this.getUniqueSorted(
          winners.map(
            winner =>
              winner.parameters.takeProfitPercent
          )
        ),
      stopLossPercent:
        this.getUniqueSorted(
          winners.map(
            winner =>
              winner.parameters.stopLossPercent
          )
        )
    };
  }

  private getUniqueSorted(
    values: number[]
  ) {
    return Array.from(
      new Set(values)
    ).sort((a, b) => a - b);
  }

  private classifyOverallAssessment(
    totalWindows: number,
    winners: ValidationAssessment[]
  ): "ROBUST" | "MIXED" | "WEAK" {
    if (totalWindows === 0) {
      return "WEAK";
    }

    const robustWindows =
      winners.filter(
        winner => winner.isRobust
      ).length;
    const robustRate =
      robustWindows / totalWindows;
    const averageConsistency =
      winners.length === 0
        ? 0
        : winners.reduce(
          (sum, winner) =>
            sum + winner.consistencyScore,
          0
        ) / winners.length;

    if (
      robustRate >= 0.7 &&
      averageConsistency >= 60
    ) {
      return "ROBUST";
    }

    if (
      robustRate >= 0.4 &&
      averageConsistency >= 45
    ) {
      return "MIXED";
    }

    return "WEAK";
  }
}
