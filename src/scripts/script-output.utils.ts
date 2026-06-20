import { BacktestResult } from "../models/backtest.model";
import {
  OptimizationResult,
  ValidationAssessment
} from "../models/optimization.model";
import { WalkForwardResult } from "../backtesting/walk-forward.service";

export function isSummaryMode(
  value: unknown
) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    return value.trim().toLowerCase() === "true";
  }

  return false;
}

export function summarizeBacktestResult(
  result: BacktestResult
) {
  return {
    period: {
      from:
        result.from.toISOString(),
      to:
        result.to.toISOString()
    },
    strategy:
      result.context.strategyName,
    strategyParameters:
      result.context.strategyParameters,
    capital: {
      initial:
        result.initialCapital,
      final:
        result.finalCapital,
      netProfit:
        result.netProfit,
      returnPercent:
        result.returnPercent
    },
    trades: {
      total:
        result.totalTrades,
      wins:
        result.wins,
      losses:
        result.losses,
      winRate:
        result.winRate,
      profitFactor:
        result.profitFactor,
      expectancy:
        result.expectancy,
      averageWin:
        result.averageWin,
      averageLoss:
        result.averageLoss,
      maxConsecutiveWins:
        result.maxConsecutiveWins,
      maxConsecutiveLosses:
        result.maxConsecutiveLosses
    },
    risk: {
      maxDrawdown:
        result.maxDrawdown,
      exposureTimePercent:
        result.exposureTimePercent,
      averageHoldingHours:
        result.averageHoldingHours
    },
    bestTrade:
      summarizeTrade(
        result.bestTrade
      ),
    worstTrade:
      summarizeTrade(
        result.worstTrade
      ),
    dataQuality: {
      isValid:
        result.dataQuality.isValid,
      expectedCandles:
        result.dataQuality.expectedCandles,
      actualCandles:
        result.dataQuality.actualCandles,
      gapCount:
        result.dataQuality.gapCount,
      duplicateCount:
        result.dataQuality.duplicateCount,
      invalidCandleCount:
        result.dataQuality.invalidCandleCount
    }
  };
}

export function summarizeValidationResult(
  split: {
    trainingFrom: Date;
    trainingTo: Date;
    validationFrom: Date;
    validationTo: Date;
    splitRatio: number;
    totalCandles: number;
  },
  result: ValidationAssessment
) {
  return {
    split: {
      trainingFrom:
        split.trainingFrom.toISOString(),
      trainingTo:
        split.trainingTo.toISOString(),
      validationFrom:
        split.validationFrom.toISOString(),
      validationTo:
        split.validationTo.toISOString(),
      splitRatio:
        split.splitRatio,
      totalCandles:
        split.totalCandles
    },
    parameters:
      result.parameters,
    training:
      summarizeValidationSlice(
        result.training
      ),
    validation:
      summarizeValidationSlice(
        result.validation
      ),
    robustness: {
      isRobust:
        result.isRobust,
      overfittingDetected:
        result.overfittingDetected,
      consistencyScore:
        result.consistencyScore,
      robustnessScore:
        result.robustnessScore,
      parameterStabilityScore:
        result.parameterStabilityScore,
      returnDeltaPercent:
        result.returnDeltaPercent,
      returnDegradationPercent:
        result.returnDegradationPercent,
      drawdownDeltaPercent:
        result.drawdownDeltaPercent,
      tradeCountDeltaPercent:
        result.tradeCountDeltaPercent,
      profitFactorDeltaPercent:
        result.profitFactorDeltaPercent,
      expectancyDeltaPercent:
        result.expectancyDeltaPercent,
      robustnessFlags:
        result.robustnessFlags
    }
  };
}

export function summarizeOptimizationResult(
  result: OptimizationResult,
  top: number
) {
  return {
    split: {
      trainingFrom:
        result.split.trainingFrom.toISOString(),
      trainingTo:
        result.split.trainingTo.toISOString(),
      validationFrom:
        result.split.validationFrom.toISOString(),
      validationTo:
        result.split.validationTo.toISOString(),
      splitRatio:
        result.split.splitRatio,
      totalCandles:
        result.split.totalCandles
    },
    candidateCount:
      result.candidateCount,
    robustCandidateCount:
      result.robustCandidateCount,
    overfittedCandidateCount:
      result.overfittedCandidateCount,
    bestCandidate:
      summarizeAssessment(
        result.bestCandidate
      ),
    bestOverallCandidate:
      summarizeAssessment(
        result.bestOverallCandidate
      ),
    topCandidates:
      result.rankedCandidates
        .slice(0, top)
        .map(
          summarizeAssessment
        )
  };
}

export function summarizeWalkForwardResult(
  result: WalkForwardResult
) {
  return {
    totalWindows:
      result.totalWindows,
    robustWindows:
      result.robustWindows,
    robustWindowRatePercent:
      result.robustWindowRatePercent,
    averageValidationReturn:
      result.averageValidationReturn,
    averageValidationDrawdown:
      result.averageValidationDrawdown,
    averageValidationConsistencyScore:
      result.averageValidationConsistencyScore,
    averageValidationDegradationPercent:
      result.averageValidationDegradationPercent,
    parameterConsistency:
      result.parameterConsistency,
    overallAssessment:
      result.overallAssessment,
    windows:
      result.windows.map(
        item => ({
          index:
            item.window.index,
          trainingFrom:
            item.window.trainingFrom.toISOString(),
          trainingTo:
            item.window.trainingTo.toISOString(),
          validationFrom:
            item.window.validationFrom.toISOString(),
          validationTo:
            item.window.validationTo.toISOString(),
          winner:
            summarizeAssessment(
              item.winner
            )
        })
      )
  };
}

function summarizeValidationSlice(
  result: BacktestResult
) {
  return {
    totalTrades:
      result.totalTrades,
    returnPercent:
      result.returnPercent,
    maxDrawdown:
      result.maxDrawdown,
    profitFactor:
      result.profitFactor,
    expectancy:
      result.expectancy,
    winRate:
      result.winRate,
    exposureTimePercent:
      result.exposureTimePercent,
    averageHoldingHours:
      result.averageHoldingHours
  };
}

function summarizeAssessment(
  candidate: ValidationAssessment | null
) {
  if (!candidate) {
    return null;
  }

  return {
    parameters:
      candidate.parameters,
    training:
      summarizeValidationSlice(
        candidate.training
      ),
    validation:
      summarizeValidationSlice(
        candidate.validation
      ),
    isRobust:
      candidate.isRobust,
    overfittingDetected:
      candidate.overfittingDetected,
    consistencyScore:
      candidate.consistencyScore,
    robustnessScore:
      candidate.robustnessScore,
    parameterStabilityScore:
      candidate.parameterStabilityScore,
    returnDegradationPercent:
      candidate.returnDegradationPercent,
    drawdownDeltaPercent:
      candidate.drawdownDeltaPercent,
    robustnessFlags:
      candidate.robustnessFlags
  };
}

function summarizeTrade(
  trade: BacktestResult["bestTrade"]
) {
  if (!trade) {
    return null;
  }

  return {
    entryTime:
      trade.entryTime.toISOString(),
    exitTime:
      trade.exitTime.toISOString(),
    entryPrice:
      trade.entryPrice,
    exitPrice:
      trade.exitPrice,
    netPnl:
      trade.netPnl,
    profitPercent:
      trade.profitPercent,
    exitReason:
      trade.exitReason
  };
}
