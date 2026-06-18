export interface Candle {
  symbol: string;
  timeframe: string;
  openTime: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}
