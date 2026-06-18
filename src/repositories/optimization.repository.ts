import { OptimizationResult } from "../models/optimization.model";
import { SqlService } from "../database/sql.service";

export class OptimizationRepository {
  constructor(
    private sql: SqlService
  ) { }

  async saveRun(
    strategy: string,
    result: OptimizationResult
  ) {
    const runInsert =
      await this.sql.query(
        `
        INSERT INTO optimization_runs
        (
          strategy,
          training_from,
          training_to,
          validation_from,
          validation_to,
          split_ratio,
          candidate_count
        )
        OUTPUT INSERTED.id AS id
        VALUES
        (
          @strategy,
          @trainingFrom,
          @trainingTo,
          @validationFrom,
          @validationTo,
          @splitRatio,
          @candidateCount
        )
        `,
        {
          strategy,
          trainingFrom:
            result.split.trainingFrom,
          trainingTo:
            result.split.trainingTo,
          validationFrom:
            result.split.validationFrom,
          validationTo:
            result.split.validationTo,
          splitRatio:
            result.split.splitRatio,
          candidateCount:
            result.candidateCount
        }
      );

    const optimizationRunId =
      runInsert.recordset[0].id as number;

    for (let i = 0; i < result.rankedCandidates.length; i++) {
      const candidate =
        result.rankedCandidates[i];

      await this.sql.query(
        `
        INSERT INTO optimization_results
        (
          optimization_run_id,
          rank_position,
          parameters_json,
          training_return_percent,
          validation_return_percent,
          training_drawdown,
          validation_drawdown,
          training_trades,
          validation_trades,
          return_degradation_percent,
          parameter_stability_score,
          robustness_score,
          overfitting_detected,
          is_robust
        )
        VALUES
        (
          @optimizationRunId,
          @rankPosition,
          @parametersJson,
          @trainingReturnPercent,
          @validationReturnPercent,
          @trainingDrawdown,
          @validationDrawdown,
          @trainingTrades,
          @validationTrades,
          @returnDegradationPercent,
          @parameterStabilityScore,
          @robustnessScore,
          @overfittingDetected,
          @isRobust
        )
        `,
        {
          optimizationRunId,
          rankPosition: i + 1,
          parametersJson:
            JSON.stringify(candidate.parameters),
          trainingReturnPercent:
            candidate.training.returnPercent,
          validationReturnPercent:
            candidate.validation.returnPercent,
          trainingDrawdown:
            candidate.training.maxDrawdown,
          validationDrawdown:
            candidate.validation.maxDrawdown,
          trainingTrades:
            candidate.training.totalTrades,
          validationTrades:
            candidate.validation.totalTrades,
          returnDegradationPercent:
            candidate.returnDegradationPercent,
          parameterStabilityScore:
            candidate.parameterStabilityScore,
          robustnessScore:
            candidate.robustnessScore,
          overfittingDetected:
            candidate.overfittingDetected,
          isRobust:
            candidate.isRobust
        }
      );
    }

    return optimizationRunId;
  }
}
