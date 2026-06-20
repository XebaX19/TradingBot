import minimist from "minimist";
import { BacktestMetricsService } from "../backtesting/backtest-metrics.service";
import { StrategyValidatorService } from "../backtesting/strategy-validator.service";
import { env } from "../config/env";
import { MarketDataService } from "../data/market-data.service";
import { SqlService } from "../database/sql.service";
import { CandleRepository } from "../repositories/candle.repository";
import { configureScriptLogging } from "./script-logging.utils";
import {
  isSummaryMode,
  summarizeValidationResult
} from "./script-output.utils";

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
    throw new Error(`Invalid date: ${value}`);
  }

  return date;
}

async function main() {
  configureScriptLogging(
    args.logLevel,
    "info"
  );

  const from =
    parseDate(
      args.from || "2020-01-01T00:00:00.000Z"
    );
  const to =
    parseDate(
      args.to || new Date().toISOString()
    );
  const splitRatio =
    args.splitRatio === undefined
      ? 0.7
      : Number(args.splitRatio);

  const validator =
    new StrategyValidatorService(
      new MarketDataService(
        new CandleRepository(
          new SqlService()
        )
      ),
      new BacktestMetricsService()
    );
  const split =
    await validator.createDatasetSplit(
      from,
      to,
      splitRatio
    );
  const result =
    await validator.validateParameters(
      env.strategy,
      split
    );
  const output =
    isSummaryMode(args.summary)
      ? summarizeValidationResult(
        split,
        result
      )
      : {
        split,
        result
      };

  console.log(
    JSON.stringify(
      output,
      null,
      2
    )
  );
}

main();
