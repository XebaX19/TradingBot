import { Candle } from "./candle.model";

export type ReconciliationIssueType =
  "MISSING" |
  "DUPLICATE" |
  "INVALID_OHLC" |
  "NON_POSITIVE_PRICE" |
  "NEGATIVE_VOLUME";

export interface ReconciliationIssue {
  type: ReconciliationIssueType;
  openTime: Date;
  detail: string;
}

export interface ReconciliationResult {
  checked: number;
  missing: number;
  recovered: number;
  duplicates: number;
  invalid: number;
  issues: ReconciliationIssue[];
  recoveredCandles: Candle[];
}
