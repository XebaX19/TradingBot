import { Candle } from "../models/candle.model";
import { TradeSignal } from "../models/trade-signal.model";
import { BacktestTrade } from "../models/backtest.model";

export class TradeSimulator {
  constructor(
    private config = {
      maxHoldingCandles: 720  //30 días como máximo queda abierta la operación
    }
  ) { }

  simulate(
    signal: TradeSignal,
    futureCandles: Candle[]
  ) {
    const candlesToCheck =
      futureCandles.slice(
        0,
        this.config.maxHoldingCandles
      );

    for (const candle of candlesToCheck) {
      /*
      IMPORTANTE:
      SL primero. Si una vela toca TP y SL, tomamos escenario conservador.     
      */

      if (
        candle.low <= signal.stopLoss
      ) {
        return {
          exitTime: candle.openTime,
          exitPrice: signal.stopLoss,
          result: "LOSS",
          profitPercent:
            (
              (signal.stopLoss -
                signal.entryPrice)
              /
              signal.entryPrice
            )
            *
            100,
          exitReason: "STOP_LOSS"
        } as Omit<BacktestTrade, "signal" | "entryTime" | "entryPrice" >;
      }

      if (
        candle.high >= signal.takeProfit
      ) {
        return {
          exitTime: candle.openTime,
          exitPrice: signal.takeProfit,
          result: "WIN",
          profitPercent:
            (
              (signal.takeProfit -
                signal.entryPrice)
              /
              signal.entryPrice
            )
            *
            100,
          exitReason: "TAKE_PROFIT"
        } as Omit<BacktestTrade, "signal" | "entryTime" | "entryPrice" >;
      }
    }

    /*
    No tocó TP ni SL
    Cerramos al final del período máximo
    */
    const lastCandle =
      candlesToCheck[
      candlesToCheck.length - 1
      ];

    return {
      exitTime: lastCandle.openTime,
      exitPrice: lastCandle.close,
      result: lastCandle.close >= signal.entryPrice
          ?
          "WIN"
          :
          "LOSS",
      profitPercent:
        (
          (lastCandle.close -
            signal.entryPrice)
          /
          signal.entryPrice
        )
        *
        100,
      exitReason: "MAX_HOLDING_TIME"
    } as Omit<BacktestTrade, "signal" | "entryTime" | "entryPrice" >;
  }
}
