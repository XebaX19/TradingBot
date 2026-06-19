import { env } from "../config/env";
import {
  OptimizationResult,
  StrategyParameterGrid,
  ValidationAssessment
} from "../models/optimization.model";
import { OptimizationRepository } from "../repositories/optimization.repository";
import { HybridStrategyConfig } from "../strategy/hybrid.strategy";
import { StrategyValidatorService } from "./strategy-validator.service";

export class StrategyOptimizerService {
  constructor(
    private validator: StrategyValidatorService,
    private repository?: OptimizationRepository,
    private baseConfig: HybridStrategyConfig = env.strategy
  ) { }

  async optimize(
    from: Date,
    to: Date,
    grid: StrategyParameterGrid,
    splitRatio: number = 0.7
  ): Promise<OptimizationResult> {
    const split =
      await this.validator.createDatasetSplit(
        from,
        to,
        splitRatio
      );
    const parameterSets =
      this.generateParameterSets(grid);
    const candidates: ValidationAssessment[] = [];

    for (const parameters of parameterSets) {
      const assessment =
        await this.validator.validateParameters(
          parameters,
          split
        );

      candidates.push(assessment);
    }

    this.applyParameterStabilityScores(
      candidates
    );

    const rankedCandidates =
      candidates
        .slice()
        .sort(
          (a, b) =>
            this.calculateRankingScore(b) -
            this.calculateRankingScore(a)
        );
    const bestRobustCandidate =
      rankedCandidates.find(
        candidate => candidate.isRobust
      ) ?? null;

    const result: OptimizationResult = {
      split,
      candidateCount:
        rankedCandidates.length,
      robustCandidateCount:
        rankedCandidates.filter(
          candidate => candidate.isRobust
        ).length,
      overfittedCandidateCount:
        rankedCandidates.filter(
          candidate =>
            candidate.overfittingDetected
        ).length,
      rankedCandidates,
      bestCandidate:
        bestRobustCandidate,
      bestOverallCandidate:
        rankedCandidates[0] ?? null
    };

    if (this.repository) {
      await this.repository.saveRun(
        "HYBRID_RSI_EMA200",
        result
      );
    }

    return result;
  }

  private generateParameterSets(
    grid: StrategyParameterGrid
  ) {
    const result: HybridStrategyConfig[] = [];

    for (const dropPercent of grid.dropPercent) {
      for (const rsiLimit of grid.rsiLimit) {
        for (const volumeMultiplier of grid.volumeMultiplier) {
          for (const takeProfitPercent of grid.takeProfitPercent) {
            for (const stopLossPercent of grid.stopLossPercent) {
              result.push({
                ...this.baseConfig,
                dropPercent,
                rsiLimit,
                volumeMultiplier,
                takeProfitPercent,
                stopLossPercent
              });
            }
          }
        }
      }
    }

    return result;
  }

  /**
   * La estabilidad de parametros se aproxima observando vecinos del grid.
   * Si pequenos cambios en el set elegido destruyen validation, el score baja.
   */
  private applyParameterStabilityScores(
    candidates: ValidationAssessment[]
  ) {
    for (const candidate of candidates) {
      const neighbors =
        candidates.filter(
          other =>
            other !== candidate &&
            this.isNeighbor(
              candidate.parameters,
              other.parameters
            )
        );

      if (neighbors.length === 0) {
        candidate.parameterStabilityScore =
          candidate.robustnessScore;
        continue;
      }

      const averageNeighborScore =
        neighbors.reduce(
          (sum, neighbor) =>
            sum + neighbor.robustnessScore,
          0
        )
        /
        neighbors.length;
      const robustNeighborRatio =
        neighbors.filter(
          neighbor => neighbor.isRobust
        ).length /
        neighbors.length;

      candidate.parameterStabilityScore =
        (candidate.consistencyScore * 0.4) +
        (candidate.robustnessScore * 0.2) +
        (averageNeighborScore * 0.2) +
        (robustNeighborRatio * 100 * 0.2);
    }
  }

  private calculateRankingScore(
    candidate: ValidationAssessment
  ) {
    return (
      candidate.robustnessScore +
      (candidate.parameterStabilityScore * 0.2) +
      (candidate.consistencyScore * 0.2)
    );
  }

  private isNeighbor(
    left: HybridStrategyConfig,
    right: HybridStrategyConfig
  ) {
    let differences = 0;

    if (left.dropPercent !== right.dropPercent) {
      differences += 1;
    }

    if (left.rsiLimit !== right.rsiLimit) {
      differences += 1;
    }

    if (left.volumeMultiplier !== right.volumeMultiplier) {
      differences += 1;
    }

    if (left.takeProfitPercent !== right.takeProfitPercent) {
      differences += 1;
    }

    if (left.stopLossPercent !== right.stopLossPercent) {
      differences += 1;
    }

    return differences === 1;
  }
}
