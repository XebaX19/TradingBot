import { env } from "../config/env";
import { Candle } from "../models/candle.model";
import {
  BacktestExitReason,
  BacktestTrade,
  BacktestTradeResult
} from "../models/backtest.model";
import { TradeSignal } from "../models/trade-signal.model";

export interface TradeSimulatorConfig {
  maxHoldingCandles: number;
  commissionPercent: number;
  slippagePercent: number;
  positionSizePercent: number;
}

interface SimulatedExit {
  exitCandle: Candle;
  exitPrice: number;
  exitReason: BacktestExitReason;
  exitOffset: number;
}

export interface SimulatedTradeResult {
  trade: BacktestTrade;
  exitIndexOffset: number;
}

export class TradeSimulator {
  constructor(
    private config: TradeSimulatorConfig = {
      maxHoldingCandles:
        env.strategy.maxHoldingCandles,
      commissionPercent:
        env.backtest.commissionPercent,
      slippagePercent:
        env.backtest.slippagePercent,
      positionSizePercent:
        env.backtest.positionSizePercent
    }
  ) { }

  /**
   * Simula un trade a partir de una senal ya confirmada.
   *
   * Punto critico:
   * La entrada se hace sobre la apertura de la siguiente vela. De esa forma la
   * estrategia no "compra" al cierre de una vela usando informacion que solo
   * se conocio cuando esa vela ya termino.
   */
  simulate(
    signal: TradeSignal,
    futureCandles: Candle[],
    equityBefore: number
  ): SimulatedTradeResult | null {
    if (
      futureCandles.length === 0 ||
      equityBefore <= 0
    ) {
      return null;
    }

    const entryCandle =
      futureCandles[0];
    const positionSize =
      equityBefore *
      (
        this.config.positionSizePercent / 100
      );

    if (positionSize <= 0) {
      return null;
    }

    const entryPrice =
      entryCandle.open *
      (
        1 +
        (this.config.slippagePercent / 100)
      );

    const quantity =
      positionSize / entryPrice;

    // Recalculamos niveles desde el precio ejecutado para respetar el riesgo
    // definido por la estrategia aun cuando haya slippage.
    const stopLossPrice =
      entryPrice *
      (
        1 -
        (signal.risk.stopLossPercent / 100)
      );
    const takeProfitPrice =
      entryPrice *
      (
        1 +
        (signal.risk.takeProfitPercent / 100)
      );

    const exit =
      this.resolveExit(
        futureCandles,
        stopLossPrice,
        takeProfitPrice
      );

    const grossPnl =
      (
        exit.exitPrice - entryPrice
      )
      *
      quantity;

    const entryFee =
      positionSize *
      (
        this.config.commissionPercent / 100
      );
    const exitNotional =
      exit.exitPrice * quantity;
    const exitFee =
      exitNotional *
      (
        this.config.commissionPercent / 100
      );
    const feesPaid =
      entryFee + exitFee;
    const netPnl =
      grossPnl - feesPaid;
    const equityAfter =
      equityBefore + netPnl;
    const profitPercent =
      (netPnl / positionSize) * 100;
    const result: BacktestTradeResult =
      netPnl >= 0 ? "WIN" : "LOSS";

    return {
      exitIndexOffset:
        exit.exitOffset,
      trade: {
        signal,
        entryTime: entryCandle.openTime,
        entryPrice,
        exitTime: exit.exitCandle.openTime,
        exitPrice: exit.exitPrice,
        quantity,
        positionSize,
        grossPnl,
        netPnl,
        feesPaid,
        profitPercent,
        equityBefore,
        equityAfter,
        result,
        exitReason: exit.exitReason
      }
    };
  }

  /**
   * Regla conservadora:
   * si una misma vela toca SL y TP, asumimos SL primero. Con OHLCV no tenemos
   * la secuencia intrabar, asi que este supuesto evita sobrestimar resultados.
   */
  private resolveExit(
    futureCandles: Candle[],
    stopLossPrice: number,
    takeProfitPrice: number
  ): SimulatedExit {
    const candlesToCheck =
      futureCandles.slice(
        0,
        this.config.maxHoldingCandles
      );

    for (let i = 0; i < candlesToCheck.length; i++) {
      const candle =
        candlesToCheck[i];

      if (candle.low <= stopLossPrice) {
        return {
          exitCandle: candle,
          exitPrice: stopLossPrice,
          exitReason: "STOP_LOSS",
          exitOffset: i
        };
      }

      if (candle.high >= takeProfitPrice) {
        return {
          exitCandle: candle,
          exitPrice: takeProfitPrice,
          exitReason: "TAKE_PROFIT",
          exitOffset: i
        };
      }
    }

    const lastCandle =
      candlesToCheck[candlesToCheck.length - 1];

    const exitPrice =
      lastCandle.close *
      (
        1 -
        (this.config.slippagePercent / 100)
      );

    return {
      exitCandle: lastCandle,
      exitPrice,
      exitReason: "MAX_HOLDING_TIME",
      exitOffset: candlesToCheck.length - 1
    };
  }
}
