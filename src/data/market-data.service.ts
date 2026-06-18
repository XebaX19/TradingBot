import { env } from "../config/env";
import { Candle } from "../models/candle.model";
import { CandleRepository } from "../repositories/candle.repository";

export class MarketDataService {
  constructor(
    private candleRepository: CandleRepository
  ) { }

  async getHourlyCandles(
    limit: number
  ): Promise<Candle[]> {
    return this.candleRepository.getLastCandles(
      env.market.symbol,
      env.market.timeframe,
      limit
    );
  }

  async getDailyCandles(
    days: number
  ): Promise<Candle[]> {
    const hourly =
      await this.getHourlyCandles(
        days * 24
      );

    return this.aggregateDaily(hourly);
  }

  async getHourlyRange(
    from: Date,
    to: Date
  ): Promise<Candle[]> {
    return this.candleRepository.getCandlesByRange(
      env.market.symbol,
      env.market.timeframe,
      from,
      to
    );
  }

  buildDaily(
    candles: Candle[]
  ): Candle[] {
    return this.aggregateDaily(candles);
  }

  /**
   * Deriva velas diarias desde 1h sin consultar otra fuente de datos.
   *
   * Punto critico:
   * La calidad de la EMA200 diaria depende de que las velas horarias esten
   * completas y ordenadas cronologicamente.
   */
  private aggregateDaily(
    candles: Candle[]
  ): Candle[] {
    const daily =
      new Map<string, Candle>();

    for (const candle of candles) {
      const key =
        candle.openTime
          .toISOString()
          .substring(0, 10);
      const current =
        daily.get(key);

      if (!current) {
        daily.set(
          key,
          {
            symbol: candle.symbol,
            timeframe: "1d",
            openTime: new Date(key),
            open: candle.open,
            high: candle.high,
            low: candle.low,
            close: candle.close,
            volume: candle.volume
          }
        );

        continue;
      }

      current.high =
        Math.max(
          current.high,
          candle.high
        );
      current.low =
        Math.min(
          current.low,
          candle.low
        );
      current.close =
        candle.close;
      current.volume +=
        candle.volume;
    }

    return Array.from(
      daily.values()
    );
  }
}
