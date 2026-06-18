import { env } from "../config/env";
import { Candle } from "../models/candle.model";
import { TradeSignal } from "../models/trade-signal.model";
import { generateSignalId } from "../shared/signalid.utils";
import {
  calculateAverage,
  calculateEMA,
  calculateRSI
} from "./indicators";

export interface HybridStrategyConfig {
  dropPercent: number;
  rsiPeriod: number;
  rsiLimit: number;
  volumeMultiplier: number;
  volumeLookbackCandles: number;
  recentHighLookbackCandles: number;
  takeProfitPercent: number;
  stopLossPercent: number;
  maxHoldingCandles: number;
}

export class HybridStrategy {
  private readonly strategyName =
    "HYBRID_RSI_EMA200";

  constructor(
    private config: HybridStrategyConfig = env.strategy
  ) { }

  /**
   * Evalua la ultima vela cerrada disponible.
   *
   * Punto critico:
   * La estrategia trabaja siempre sobre series ya cerradas. La ejecucion real
   * o simulada de la orden debe ocurrir en la vela siguiente para evitar
   * look-ahead bias.
   */
  evaluate(
    hourly: Candle[],
    daily: Candle[]
  ): TradeSignal | null {
    if (
      hourly.length === 0 ||
      daily.length === 0
    ) {
      return null;
    }

    const lastHourly =
      hourly[hourly.length - 1];
    const lastPrice =
      lastHourly.close;

    const dailyCloses =
      daily.map(candle => candle.close);
    const ema200 =
      calculateEMA(
        dailyCloses,
        200
      );

    if (ema200 === null) {
      return null;
    }

    // Solo se consideran largos cuando el cierre actual esta sobre la EMA200 diaria.
    if (lastPrice <= ema200) {
      return null;
    }

    const hourlyCloses =
      hourly.map(candle => candle.close);
    const rsi =
      calculateRSI(
        hourlyCloses,
        this.config.rsiPeriod
      );

    if (
      rsi === null ||
      rsi >= this.config.rsiLimit
    ) {
      return null;
    }

    const recentCandles =
      hourly.slice(
        -this.config.recentHighLookbackCandles
      );

    if (recentCandles.length === 0) {
      return null;
    }

    const recentHigh =
      Math.max(
        ...recentCandles.map(
          candle => candle.high
        )
      );

    const dropPercent =
      (
        (recentHigh - lastPrice)
        /
        recentHigh
      )
      *
      100;

    if (
      dropPercent <
      this.config.dropPercent
    ) {
      return null;
    }

    const volumeWindow =
      hourly.slice(
        -this.config.volumeLookbackCandles
      );

    if (volumeWindow.length === 0) {
      return null;
    }

    const averageVolume =
      calculateAverage(
        volumeWindow.map(
          candle => candle.volume
        )
      );

    const volumeRatio =
      lastHourly.volume / averageVolume;

    if (
      volumeRatio <
      this.config.volumeMultiplier
    ) {
      return null;
    }

    const stopLoss =
      lastPrice *
      (
        1 -
        (this.config.stopLossPercent / 100)
      );

    const takeProfit =
      lastPrice *
      (
        1 +
        (this.config.takeProfitPercent / 100)
      );

    const signalId =
      generateSignalId(
        lastHourly.symbol,
        this.strategyName,
        lastHourly.openTime
      );

    return {
      signalId,
      type: "BUY_SIGNAL",
      symbol: lastHourly.symbol,
      side: "BUY",
      entryPrice: lastPrice,
      stopLoss,
      takeProfit,
      timestamp: lastHourly.openTime,
      strategy: this.strategyName,
      indicators: {
        rsi,
        ema200,
        dropPercent,
        volumeRatio
      },
      risk: {
        stopLossPercent:
          this.config.stopLossPercent,
        takeProfitPercent:
          this.config.takeProfitPercent,
        riskReward:
          this.config.takeProfitPercent
          /
          this.config.stopLossPercent
      },
      reason: [
        "Precio sobre EMA200",
        "RSI sobreventa",
        "Correccion fuerte",
        "Volumen confirmado"
      ]
    };
  }

  /**
   * Devuelve la cantidad minima de velas horarias necesarias para que todos los
   * filtros del modelo se calculen sin lookups parciales.
   *
   * Punto critico:
   * La EMA200 diaria se deriva desde velas de 1h, por eso el warmup debe
   * contemplar al menos 200 dias * 24 horas.
   */
  getRequiredHourlyHistory() {
    const emaDailyWarmup =
      200 * 24;
    const localWarmup =
      Math.max(
        this.config.rsiPeriod + 1,
        this.config.volumeLookbackCandles,
        this.config.recentHighLookbackCandles
      );

    return Math.max(
      emaDailyWarmup,
      localWarmup
    );
  }

  getStrategyName() {
    return this.strategyName;
  }

  getConfig() {
    return {
      ...this.config
    };
  }
}
