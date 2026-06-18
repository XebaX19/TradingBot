import { TradeSignal } from "../models/trade-signal.model";

export interface BacktestTrade {
  signal: TradeSignal;
  entryTime: Date;
  entryPrice: number;
  exitTime?: Date;
  exitPrice?: number;
  result?: "WIN" | "LOSS";
  profitPercent: number;
  exitReason?: "TAKE_PROFIT" | "STOP_LOSS" | "MAX_HOLDING_TIME";
}

export interface BacktestResult {
  from: Date;
  to: Date;
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  totalReturn: number;
  averageWin: number;
  averageLoss: number;
  trades: BacktestTrade[];
}
