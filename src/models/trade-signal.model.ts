export interface TradeSignal {
  signalId: string;
  type: "BUY_SIGNAL";
  symbol: string;
  side: "BUY";
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  timestamp: Date;
  strategy: string;
  indicators: {
    rsi: number | null;
    ema200: number | null;
    dropPercent: number;
    volumeRatio: number;
  };
  risk: {
    stopLossPercent: number;
    takeProfitPercent: number;
    riskReward: number;
  };
  reason: string[];
}
