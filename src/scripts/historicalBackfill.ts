import minimist from "minimist";
import { BinanceClient } from "../data/binance.client";
import { SqlService } from "../database/sql.service";
import { CandleRepository } from "../repositories/candle.repository";
import { env } from "../config/env";
import { logger } from "../shared/logger";
import {
  clampToLastClosedCandleUtc,
  getIntervalMs
} from "../shared/date.utils";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_DELAY_MS = 1500;
const BINANCE_MIN_DATE = new Date(2017, 6, 1, 0, 0, 0, 0);

const args =
  minimist(
    process.argv.slice(2)
  );

type BinanceKline = [
  number,
  string,
  string,
  string,
  string,
  string
];

function parseLocalDate(value: string, hour: number) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    throw new Error(`Invalid date format: ${value}. Expected YYYY-MM-DD`);
  }

  const [, year, month, day] = match;

  return new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    hour,
    0,
    0,
    0
  );
}

function formatLocalDateTime(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function getDefaultRange() {
  const today = new Date();
  const to = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() - 1,
    23,
    0,
    0,
    0
  );

  const requestedFrom = new Date(
    to.getFullYear() - 9,
    to.getMonth(),
    to.getDate(),
    0,
    0,
    0,
    0
  );
  const from =
    requestedFrom < BINANCE_MIN_DATE
      ? new Date(BINANCE_MIN_DATE)
      : requestedFrom;

  return {
    from,
    to
  };
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function resolveRange() {
  if (args.from && args.to) {
    const from = parseLocalDate(args.from, 0);
    const to = parseLocalDate(args.to, 23);

    if (from < BINANCE_MIN_DATE) {
      throw new Error("Invalid range: from must be greater than or equal to 2017-07-01");
    }

    return {
      from,
      to
    };
  }

  return getDefaultRange();
}

function resolveDelayMs() {
  if (args.delayMs === undefined) {
    return DEFAULT_DELAY_MS;
  }

  const delayMs = Number(args.delayMs);

  if (!Number.isFinite(delayMs) || delayMs < 0) {
    throw new Error("Invalid delayMs. Expected a number greater than or equal to 0");
  }

  return delayMs;
}

function validateInterval() {
  const intervalMs = getIntervalMs(env.market.timeframe);
  const candlesPerDay = Math.ceil(ONE_DAY_MS / intervalMs);

  if (candlesPerDay > 1000) {
    throw new Error(
      `Timeframe ${env.market.timeframe} exceeds Binance 1000-candle limit for 1-day windows`
    );
  }
}

async function backfillDay(
  candleRepository: CandleRepository,
  binance: BinanceClient,
  dayStart: Date,
  dayEnd: Date
) {
  const dayLabel = formatLocalDateTime(dayStart);

  try {
    const [existing, candles] =
      await Promise.all([
        candleRepository.getByRange(
          env.market.symbol,
          env.market.timeframe,
          dayStart,
          dayEnd
        ),
        binance.getCandles(
          env.market.symbol,
          env.market.timeframe,
          dayStart.getTime(),
          dayEnd.getTime()
        )
      ]);

    const existingTimes =
      new Set(
        existing.map(
          candle => candle.getTime()
        )
      );

    if (!candles.length) {
      logger.warn(
        `No Binance data for day starting ${dayLabel}`
      );
      return;
    }

    for (const rawCandle of candles as BinanceKline[]) {
      const openTime =
        new Date(rawCandle[0]);

      if (existingTimes.has(openTime.getTime())) {
        continue;
      }

      try {
        await candleRepository.insert({
          symbol: env.market.symbol,
          timeframe: env.market.timeframe,
          openTime,
          open: Number(rawCandle[1]),
          high: Number(rawCandle[2]),
          low: Number(rawCandle[3]),
          close: Number(rawCandle[4]),
          volume: Number(rawCandle[5])
        });
      } catch (error) {
        logger.error(
          `Insert failed for candle ${formatLocalDateTime(openTime)}`,
          error
        );
      }
    }
  } catch (error) {
    logger.error(
      `Backfill failed for range ${dayLabel} - ${formatLocalDateTime(dayEnd)}`,
      error
    );
  }
}

async function main() {
  logger.level = "warn";

  validateInterval();

  const { from, to } =
    resolveRange();
  const effectiveTo =
    clampToLastClosedCandleUtc(
      to,
      new Date(),
      env.market.timeframe
    );
  const delayMs =
    resolveDelayMs();

  if (from > effectiveTo) {
    throw new Error("Invalid range: from must be less than or equal to to");
  }

  const sql = new SqlService();
  const candleRepository =
    new CandleRepository(sql);
  const binance =
    new BinanceClient();

  for (
    let current = new Date(from);
    current <= effectiveTo;
    current = new Date(current.getTime() + ONE_DAY_MS)
  ) {
    const dayStart =
      new Date(current);
    const dayEnd =
      new Date(
        Math.min(
          current.getTime() + ONE_DAY_MS - 1,
          effectiveTo.getTime()
        )
      );

    await backfillDay(
      candleRepository,
      binance,
      dayStart,
      dayEnd
    );

    if (delayMs > 0 && dayEnd < effectiveTo) {
      await sleep(delayMs);
    }
  }

  process.exit(0);
}

main();
