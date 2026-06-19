import { BacktestResult } from "./backtest.model";
import { HybridStrategyConfig } from "../strategy/hybrid.strategy";

export interface DatasetSplit {
  trainingFrom: Date;
  trainingTo: Date;
  validationFrom: Date;
  validationTo: Date;
  splitRatio: number;
  totalCandles: number;
}

export interface StrategyParameterGrid {
  dropPercent: number[];
  rsiLimit: number[];
  volumeMultiplier: number[];
  takeProfitPercent: number[];
  stopLossPercent: number[];
}

export interface ValidationAssessment {
  parameters: HybridStrategyConfig;
  training: BacktestResult;
  validation: BacktestResult;
  returnDeltaPercent: number;
  returnDegradationPercent: number;
  drawdownDeltaPercent: number;
  tradeCountDeltaPercent: number;
  profitFactorDeltaPercent: number;
  expectancyDeltaPercent: number;
  trainingReturnOverDrawdown: number;
  validationReturnOverDrawdown: number;
  consistencyScore: number;
  robustnessScore: number;
  parameterStabilityScore: number;
  overfittingDetected: boolean;
  isRobust: boolean;
  robustnessFlags: string[];
}

export interface OptimizationResult {
  split: DatasetSplit;
  candidateCount: number;
  robustCandidateCount: number;
  overfittedCandidateCount: number;
  rankedCandidates: ValidationAssessment[];
  bestCandidate: ValidationAssessment | null;
  bestOverallCandidate: ValidationAssessment | null;
}
