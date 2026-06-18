import { env } from "../config/env";
import { Candle } from "../models/candle.model";
import {
  BacktestEquityPoint,
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
  candlesObserved: Candle[];
}

export interface SimulatedTradeResult {
  trade: BacktestTrade;
  exitIndexOffset: number;
  equityPoints: BacktestEquityPoint[];
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
    const grossPnl =
      (
        exit.exitPrice - entryPrice
      )
      *
      quantity;
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
    const equityPoints =
      this.buildFloatingEquityCurve(
        exit.candlesObserved,
        equityBefore,
        quantity,
        entryPrice,
        entryFee
      );

    return {
      exitIndexOffset:
        exit.exitOffset,
      equityPoints,
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
        holdingCandles:
          exit.exitOffset + 1,
        holdingHours:
          exit.exitOffset + 1,
        maxFavorableExcursionPercent:
          this.calculateMaxFavorableExcursionPercent(
            exit.candlesObserved,
            entryPrice
          ),
        maxAdverseExcursionPercent:
          this.calculateMaxAdverseExcursionPercent(
            exit.candlesObserved,
            entryPrice
          ),
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
          exitOffset: i,
          candlesObserved:
            candlesToCheck.slice(
              0,
              i + 1
            )
        };
      }

      if (candle.high >= takeProfitPrice) {
        return {
          exitCandle: candle,
          exitPrice: takeProfitPrice,
          exitReason: "TAKE_PROFIT",
          exitOffset: i,
          candlesObserved:
            candlesToCheck.slice(
              0,
              i + 1
            )
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
      exitOffset: candlesToCheck.length - 1,
      candlesObserved:
        candlesToCheck
    };
  }

  /**
   * Curva flotante mark-to-market usando el close de cada vela abierta.
   */
  private buildFloatingEquityCurve(
    candlesObserved: Candle[],
    equityBefore: number,
    quantity: number,
    entryPrice: number,
    entryFee: number
  ) {
    return candlesObserved.map(
      (candle, index) => {
        const floatingExitNotional =
          candle.close * quantity;
        const floatingExitFee =
          floatingExitNotional *
          (
            this.config.commissionPercent / 100
          );
        const floatingNetPnl =
          (
            (candle.close - entryPrice) *
            quantity
          ) -
          entryFee -
          floatingExitFee;

        return {
          timestamp:
            candle.openTime,
          equity:
            equityBefore + floatingNetPnl,
          drawdownPercent: 0,
          tradeNumber: index + 1,
          pointType: "FLOATING" as const
        };
      }
    );
  }

  private calculateMaxFavorableExcursionPercent(
    candlesObserved: Candle[],
    entryPrice: number
  ) {
    return candlesObserved.reduce(
      (best, candle) => {
        const excursion =
          (
            (candle.high - entryPrice)
            /
            entryPrice
          )
          * 100;

        return excursion > best
          ? excursion
          : best;
      },
      0
    );
  }

  private calculateMaxAdverseExcursionPercent(
    candlesObserved: Candle[],
    entryPrice: number
  ) {
    return candlesObserved.reduce(
      (worst, candle) => {
        const excursion =
          (
            (entryPrice - candle.low)
            /
            entryPrice
          )
          * 100;

        return excursion > worst
          ? excursion
          : worst;
      },
      0
    );
  }

  getConfig() {
    return {
      ...this.config
    };
  }
}
