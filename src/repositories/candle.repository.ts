import { SqlService } from "../database/sql.service";
import { Candle } from "../models/candle.model";
import { logger } from "../shared/logger";

export class CandleRepository {
  constructor(
    private sql: SqlService
  ) { }

  async getLastCandle(
    symbol: string,
    timeframe: string
  ) {
    const result =
      await this.sql.query(`
        SELECT MAX(open_time) last
        FROM candles
        WHERE symbol=@symbol
        AND timeframe=@timeframe
        `,
        {
          symbol,
          timeframe
        });

    return result.recordset[0].last;
  }

  async getLastCandles(
    symbol: string,
    timeframe: string,
    limit: number
  ) {
    const result =
      await this.sql.query(`
        SELECT TOP (@limit)
          symbol,
          timeframe,
          open_time,
          [open],
          [high],
          [low],
          [close],
        volume
        FROM candles
        WHERE symbol=@symbol
        AND timeframe=@timeframe
        ORDER BY open_time DESC
      `,
        {
          limit,
          symbol,
          timeframe
        });

    return result.recordset
      .reverse()
      .map(x => ({
        symbol: x.symbol,
        timeframe: x.timeframe,
        openTime: new Date(x.open_time),
        open: Number(x.open),
        high: Number(x.high),
        low: Number(x.low),
        close: Number(x.close),
        volume: Number(x.volume)
      }));
  }

  async insert(candle: Candle) {
    const exists =
      await this.exists(
        candle.symbol,
        candle.timeframe,
        candle.openTime
      );

    if (exists) {
      logger.info(
        `Candle ${candle.symbol} - ${candle.openTime} already exists`
      );

      return;
    }

    await this.sql.query(`
      INSERT INTO candles
      (
        symbol,
        timeframe,
        open_time,
        [open],
        [high],
        [low],
        [close],
        volume
      )

      VALUES
      (
        @symbol,
        @timeframe,
        @openTime,
        @open,
        @high,
        @low,
        @close,
        @volume
      )
    `, candle);
  }

  async getByRange(
    symbol: string,
    timeframe: string,
    from: Date,
    to: Date
  ) {
    const result =
      await this.sql.query(`
        SELECT open_time
        FROM candles
        WHERE symbol=@symbol
        AND timeframe=@timeframe
        AND open_time BETWEEN @from AND @to
      `,
        {
          symbol,
          timeframe,
          from,
          to
        });

    return result.recordset.map(
      x => new Date(x.open_time)
    );
  }

  async exists(
    symbol: string,
    timeframe: string,
    openTime: Date
  ) {
    const result =
      await this.sql.query(`
        SELECT COUNT(*) total
        FROM candles
        WHERE symbol=@symbol
        AND timeframe=@timeframe
        AND open_time=@openTime
      `,
        {
          symbol,
          timeframe,
          openTime
        });

    return result.recordset[0].total > 0;
  }

  async getCandlesByRange(
    symbol: string,
    timeframe: string,
    from: Date,
    to: Date
  ): Promise<Candle[]> {
    const result = await this.sql.query(
      `
      SELECT
        symbol,
        timeframe,
        open_time,
        open,
        high,
        low,
        close,
        volume
      FROM candles
      WHERE symbol = @symbol
      AND timeframe = @timeframe
      AND open_time >= @from
      AND open_time <= @to
      ORDER BY open_time ASC
      `,
      {
        symbol,
        timeframe,
        from,
        to
      }
    );

    return result.recordset.map(
      (row: any) => ({
        symbol: row.symbol,
        timeframe: row.timeframe,
        openTime: row.open_time,
        open: Number(row.open),
        high: Number(row.high),
        low: Number(row.low),
        close: Number(row.close),
        volume: Number(row.volume)
      })
    );
  }
}
