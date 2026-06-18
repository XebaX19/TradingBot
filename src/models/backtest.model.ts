import { TradeSignal } from "./trade-signal.model";

export type BacktestTradeResult =
  "WIN" | "LOSS";

export type BacktestExitReason =
  "TAKE_PROFIT" |
  "STOP_LOSS" |
  "MAX_HOLDING_TIME";

export type BacktestEquityPointType =
  "REALIZED" |
  "FLOATING" |
  "FLOATING_WORST";

export interface BacktestTrade {
  signal: TradeSignal;
  entryTime: Date;
  entryPrice: number;
  exitTime: Date;
  exitPrice: number;
  quantity: number;
  positionSize: number;
  grossPnl: number;
  netPnl: number;
  feesPaid: number;
  profitPercent: number;
  equityBefore: number;
  equityAfter: number;
  holdingCandles: number;
  holdingHours: number;
  maxFavorableExcursionPercent: number;
  maxAdverseExcursionPercent: number;
  result: BacktestTradeResult;
  exitReason: BacktestExitReason;
}

export interface BacktestEquityPoint {
  timestamp: Date;
  equity: number;
  drawdownPercent: number;
  tradeNumber: number;
  pointType: BacktestEquityPointType;
}

export interface BacktestDataQualityIssue {
  timestamp?: Date;
  type:
    "INSUFFICIENT_HISTORY" |
    "GAP" |
    "DUPLICATE" |
    "INVALID_OHLC" |
    "NEGATIVE_VOLUME" |
    "NON_POSITIVE_PRICE";
  detail: string;
}

export interface BacktestDataQualityReport {
  isValid: boolean;
  expectedCandles: number;
  actualCandles: number;
  gapCount: number;
  duplicateCount: number;
  invalidCandleCount: number;
  warmupCandlesRequired: number;
  issues: BacktestDataQualityIssue[];
}

export interface BacktestExecutionContext {
  strategyName: string;
  strategyParameters: Record<string, number>;
  backtestParameters: {
    initialCapital: number;
    positionSizePercent: number;
    commissionPercent: number;
    slippagePercent: number;
    maxHoldingCandles: number;
  };
}

export interface BacktestExecutionResult {
  trades: BacktestTrade[];
  equityCurve: BacktestEquityPoint[];
  dataQuality: BacktestDataQualityReport;
  context: BacktestExecutionContext;
}

export interface BacktestRunSummary {
  from: Date;
  to: Date;
  initialCapital: number;
  finalCapital: number;
  netProfit: number;
  returnPercent: number;
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  profitFactor: number;
  averageWin: number;
  averageLoss: number;
  expectancy: number;
  averageHoldingHours: number;
  exposureTimePercent: number;
  maxDrawdown: number;
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
  bestTrade: BacktestTrade | null;
  worstTrade: BacktestTrade | null;
}

export interface BacktestResult
  extends BacktestRunSummary {
  dataQuality: BacktestDataQualityReport;
  context: BacktestExecutionContext;
  equityCurve: BacktestEquityPoint[];
  trades: BacktestTrade[];
}
