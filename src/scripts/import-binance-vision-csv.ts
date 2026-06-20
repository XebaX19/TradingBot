import fs from "fs";
import path from "path";
import readline from "readline";
import minimist from "minimist";
import { env } from "../config/env";
import { SqlService } from "../database/sql.service";
import { Candle } from "../models/candle.model";
import { CandleRepository } from "../repositories/candle.repository";
import { configureScriptLogging } from "./script-logging.utils";

const args =
  minimist(
    process.argv.slice(2)
  );

function parseDate(
  value: string
) {
  const date =
    new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error(
      `Invalid date: ${value}`
    );
  }

  return date;
}

function normalizeTimestamp(
  raw: string
) {
  const value =
    Number(raw.trim());

  if (!Number.isFinite(value)) {
    throw new Error(
      `Invalid timestamp: ${raw}`
    );
  }

  return value >= 1_000_000_000_000_000
    ? Math.floor(value / 1000)
    : value;
}

function buildCandleFromCsvRow(
  columns: string[]
) {
  if (columns.length < 6) {
    throw new Error(
      `Invalid CSV row. Expected at least 6 columns and received ${columns.length}`
    );
  }

  return {
    symbol:
      args.symbol ||
      env.market.symbol,
    timeframe:
      args.timeframe ||
      env.market.timeframe,
    openTime:
      new Date(
        normalizeTimestamp(
          columns[0]
        )
      ),
    open:
      Number(columns[1]),
    high:
      Number(columns[2]),
    low:
      Number(columns[3]),
    close:
      Number(columns[4]),
    volume:
      Number(columns[5])
  } satisfies Candle;
}

function validateNumericFields(
  candle: Candle
) {
  return Number.isFinite(candle.open) &&
    Number.isFinite(candle.high) &&
    Number.isFinite(candle.low) &&
    Number.isFinite(candle.close) &&
    Number.isFinite(candle.volume);
}

async function main() {
  configureScriptLogging(
    args.logLevel,
    "info"
  );

  const file =
    args.file || args.path;

  if (
    typeof file !== "string" ||
    file.trim() === ""
  ) {
    throw new Error(
      `
Uso:

npm run import-binance-vision-csv -- --file=PATH_CSV

Opcionales:
--from=2020-01-01T00:00:00.000Z
--to=2020-01-31T23:00:00.000Z
--symbol=BTCUSDT
--timeframe=1h
`
    );
  }

  const resolvedPath =
    path.resolve(
      process.cwd(),
      file
    );

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(
      `CSV file not found: ${resolvedPath}`
    );
  }

  if (
    resolvedPath.toLowerCase().endsWith(".zip")
  ) {
    throw new Error(
      "ZIP files are not imported directly yet. Extract the Binance Vision CSV first and retry with --file."
    );
  }

  const from =
    args.from
      ? parseDate(args.from)
      : null;
  const to =
    args.to
      ? parseDate(args.to)
      : null;

  if (from && to && from > to) {
    throw new Error(
      "Invalid range: from must be less than or equal to to"
    );
  }

  const sql =
    new SqlService();
  const candleRepository =
    new CandleRepository(sql);
  const stream =
    fs.createReadStream(
      resolvedPath,
      {
        encoding: "utf8"
      }
    );
  const reader =
    readline.createInterface({
      input: stream,
      crlfDelay: Infinity
    });

  let lineNumber = 0;
  let inserted = 0;
  let alreadyExisting = 0;
  let skippedOutOfRange = 0;
  let skippedInvalid = 0;
  let failed = 0;
  let firstImportedAt: string | null = null;
  let lastImportedAt: string | null = null;

  for await (const rawLine of reader) {
    lineNumber += 1;

    const line =
      rawLine.trim();

    if (line === "") {
      continue;
    }

    try {
      const columns =
        line.split(",");
      const candle =
        buildCandleFromCsvRow(
          columns
        );

      if (!validateNumericFields(candle)) {
        skippedInvalid += 1;
        continue;
      }

      if (
        (from && candle.openTime < from) ||
        (to && candle.openTime > to)
      ) {
        skippedOutOfRange += 1;
        continue;
      }

      const exists =
        await candleRepository.exists(
          candle.symbol,
          candle.timeframe,
          candle.openTime
        );

      if (exists) {
        alreadyExisting += 1;
        continue;
      }

      await candleRepository.insert(
        candle
      );

      inserted += 1;

      if (!firstImportedAt) {
        firstImportedAt =
          candle.openTime.toISOString();
      }

      lastImportedAt =
        candle.openTime.toISOString();
    } catch (error) {
      failed += 1;

      console.error(
        `Failed to process line ${lineNumber}: ${
          error instanceof Error
            ? error.message
            : String(error)
        }`
      );
    }
  }

  console.log(
    JSON.stringify(
      {
        file:
          resolvedPath,
        symbol:
          args.symbol ||
          env.market.symbol,
        timeframe:
          args.timeframe ||
          env.market.timeframe,
        from:
          from?.toISOString() || null,
        to:
          to?.toISOString() || null,
        inserted,
        alreadyExisting,
        skippedOutOfRange,
        skippedInvalid,
        failed,
        firstImportedAt,
        lastImportedAt
      },
      null,
      2
    )
  );
}

main();
