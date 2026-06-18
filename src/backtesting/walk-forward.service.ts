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
  robustWindows: number;
  totalWindows: number;
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
    stepDays: number
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

    for (const window of windows) {
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
      robustWindows:
        winners.filter(winner => winner.isRobust).length,
      totalWindows: results.length
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
}
