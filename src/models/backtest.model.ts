import { TradeSignal } from "./trade-signal.model";

export type BacktestTradeResult =
  "WIN" | "LOSS";

export type BacktestExitReason =
  "TAKE_PROFIT" |
  "STOP_LOSS" |
  "MAX_HOLDING_TIME";

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
  result: BacktestTradeResult;
  exitReason: BacktestExitReason;
}

/**
 * Snapshot de equity realizado luego de cada trade. Se usa para graficar la
 * curva de capital y medir drawdown sin recalcular todo el backtest.
 */
export interface BacktestEquityPoint {
  timestamp: Date;
  equity: number;
  drawdownPercent: number;
  tradeNumber: number;
}

export interface BacktestExecutionResult {
  trades: BacktestTrade[];
  equityCurve: BacktestEquityPoint[];
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
  maxDrawdown: number;
  bestTrade: BacktestTrade | null;
  worstTrade: BacktestTrade | null;
}

export interface BacktestResult
  extends BacktestRunSummary {
  equityCurve: BacktestEquityPoint[];
  trades: BacktestTrade[];
}
