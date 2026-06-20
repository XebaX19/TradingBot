import minimist from "minimist";
import { SqlService } from "../database/sql.service";
import { CandleRepository } from "../repositories/candle.repository";
import { BinanceClient } from "../data/binance.client";
import { CandleReconciliationService } from "../data/reconciliation.service";
import { env } from "../config/env";
import { clampToLastClosedCandleUtc } from "../shared/date.utils";
import { configureScriptLogging } from "./script-logging.utils";

const args =
  minimist(
    process.argv.slice(2)
  );

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

async function main() {
  configureScriptLogging(
    args.logLevel,
    "info"
  );

  if (!args.from || !args.to) {
    throw new Error(
      `
Uso:

npm run reconciliation -- 
--from=YYYY-MM-DD 
--to=YYYY-MM-DD
`
    )
  }

  const from = parseLocalDate(args.from, 0);
  const requestedTo = parseLocalDate(args.to, 23);
  const to =
    clampToLastClosedCandleUtc(
      requestedTo,
      new Date(),
      env.market.timeframe
    );

  if (from > to) {
    throw new Error(
      `Invalid range: no closed candles available between ${args.from} and ${args.to}`
    );
  }

  const sql = new SqlService();

  const service =
    new CandleReconciliationService(
      new CandleRepository(sql),
      new BinanceClient()
    );

  await service.execute(
    from,
    to
  );

  process.exit(0);
}

main();
