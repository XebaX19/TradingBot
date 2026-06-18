import { TradeSignal } from "./trade-signal.model";

export type TradingMode =
  "signal-only" |
  "paper-trading" |
  "live-trading";

export type OrderStatus =
  "PENDING" |
  "SKIPPED" |
  "ACCEPTED" |
  "FILLED" |
  "REJECTED" |
  "FAILED";

export interface OrderIntent {
  signal: TradeSignal;
  mode: TradingMode;
  quantity: number;
  expectedPrice: number;
}

export interface ExecutionDecision {
  approved: boolean;
  reason: string;
  quantity: number;
}

export interface OrderExecutionResult {
  status: OrderStatus;
  exchangeOrderId?: string;
  executedPrice?: number;
  executedQuantity?: number;
  detail: string;
  rawResponse?: string;
}

export interface OrderRecord {
  signalId: string;
  symbol: string;
  side: "BUY";
  mode: TradingMode;
  expectedPrice: number;
  quantity: number;
  status: OrderStatus;
  detail: string;
}
