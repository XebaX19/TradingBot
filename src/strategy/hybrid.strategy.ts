import { Candle } from "../models/candle.model";
import { TradeSignal } from "../models/trade-signal.model";
import { generateSignalId } from "../shared/signalid.utils";
import {
  calculateEMA,
  calculateRSI,
  calculateAverage
} from "./indicators";

export class HybridStrategy {
  private readonly strategyName = "HYYBRID_RSI_EMA200";

  constructor(
    private config = {
      dropPercent: 8,
      rsiLimit: 35,
      volumeMultiplier: 1,
      takeProfitPercent: 5,
      stopLossPercent: 3,
      maxHoldingCandles: 720 //30 días como máximo queda abierta la operación
    }
  ) { }

  evaluate(
    hourly: Candle[],
    daily: Candle[]
  ): TradeSignal | null {
    const lastHourly = hourly[hourly.length - 1];
    const lastPrice = lastHourly.close;

    //EMA 200 diaria
    const dailyCloses = daily.map(x => x.close);

    const ema200 =
      calculateEMA(
        dailyCloses,
        200
      );

    if (!ema200) {
      return null;
    }

    //Filtro tendencia
    if (lastPrice <= ema200) {
      return null;
    }

    //RSI
    const hourlyCloses = hourly.map(x => x.close);

    const rsi =
      calculateRSI(
        hourlyCloses,
        14
      );

    if (
      rsi === null ||
      rsi >= this.config.rsiLimit
    ) {
      return null;
    }

    //Caída desde máximo reciente
    const recent = hourly.slice(-24 * 7);

    const max =
      Math.max(
        ...
        recent.map(x => x.high)
      );

    const dropPercent =
      (
        (max - lastPrice)
        /
        max
      )
      *
      100;

    if (
      dropPercent <
      this.config.dropPercent
    ) {
      return null;
    }

    //Volumen
    const volumes = hourly.slice(-20).map(x => x.volume);

    const avgVolume =
      calculateAverage(
        volumes
      );

    const volumeRatio = lastHourly.volume / avgVolume;

    if (
      volumeRatio <
      this.config.volumeMultiplier
    ) {
      return null;
    }

    //Stoploss y Takeprofit
    const stopLoss =
      lastPrice *
      (
        1 -
        this.config.stopLossPercent / 100
      );

    const takeProfit =
      lastPrice *
      (
        1 +
        this.config.takeProfitPercent / 100
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
      strategy: "HYBRID_RSI_EMA200",
      risk: {
        stopLossPercent: this.config.stopLossPercent,
        takeProfitPercent: this.config.takeProfitPercent,
        riskReward:
          this.config.takeProfitPercent /
          this.config.stopLossPercent
      },
      indicators: {
        rsi,
        ema200,
        dropPercent,
        volumeRatio
      },
      reason: [
        "Precio sobre EMA200",
        "RSI sobreventa",
        "Correccion fuerte",
        "Volumen confirmado"
      ]
    }
  }
}
