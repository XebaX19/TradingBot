import { CandleRepository } from "../repositories/candle.repository";
import { Candle } from "../models/candle.model";

export class MarketDataService {
  constructor(
    private candleRepository: CandleRepository
  ) { }

  async getHourlyCandles(
    limit: number
  ): Promise<Candle[]> {
    return this.candleRepository.getLastCandles(
      "BTCUSDT",
      "1h",
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

  private aggregateDaily(
    candles: Candle[]
  ): Candle[] {
    const map = new Map<string, Candle>();

    for (const candle of candles) {
      const date = candle.openTime.toISOString().substring(0, 10);
      const current = map.get(date);

      if (!current) {
        map.set(
          date,
          {
            symbol: candle.symbol,
            timeframe: "1d",
            openTime: new Date(date),
            open: candle.open,
            high: candle.high,
            low: candle.low,
            close: candle.close,
            volume: candle.volume
          }
        );

        continue;
      }

      current.high = Math.max(current.high, candle.high);
      current.low = Math.min(current.low, candle.low);
      current.close = candle.close;
      current.volume += candle.volume;
    }

    return Array.from(
      map.values()
    );
  }

  async getHourlyRange(
    from: Date,
    to: Date
  ): Promise<Candle[]> {
    return this.candleRepository.getCandlesByRange(
      "BTCUSDT",
      "1h",
      from,
      to
    );
  }

  buildDaily(
    candles: Candle[]
  ): Candle[] {
    const daily = new Map<string, Candle>();

    for (const candle of candles) {
      const key = candle.openTime.toISOString().substring(0, 10);
      const current = daily.get(key);

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

      current.close = candle.close;

      current.volume += candle.volume;
    }

    return Array.from(
      daily.values()
    );
  }
}
