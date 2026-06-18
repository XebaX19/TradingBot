import axios from "axios";
import { env } from "../config/env";

export class BinanceClient {

  async getCandles(
    symbol: string,
    interval: string,
    start: number,
    end: number
  ) {
    const response =
      await axios.get(
        `${env.binance.url}/api/v3/klines`,
        {
          params: {
            symbol,
            interval,
            startTime: start,
            endTime: end
          }
        }
      );

    return response.data;
  }

  async getLastClosedCandle(
    symbol: string,
    interval: string
  ) {
    const response =
      await axios.get(
        `${env.binance.url}/api/v3/klines`,
        {
          params: {
            symbol,
            interval,
            limit: 2
          }
        }
      );

    const candles = response.data;

    if (candles.length < 2) {
      throw new Error(
        "Not enough candle data"
      );
    }

    const closedCandle = candles[candles.length - 2];
    const openTime = new Date(closedCandle[0]);
    const closeTime = new Date(closedCandle[0] + 60 * 60 * 1000 );

    if (closeTime > new Date()) {
      throw new Error(
        "Candle still open"
      );
    }

    return {
      symbol,
      timeframe: interval,
      openTime,
      open: Number(closedCandle[1]),
      high: Number(closedCandle[2]),
      low: Number(closedCandle[3]),
      close: Number(closedCandle[4]),
      volume: Number(closedCandle[5])
    };
  }
}
