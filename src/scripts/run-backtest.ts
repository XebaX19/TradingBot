import minimist from "minimist";
import { BacktestDataValidatorService } from "../backtesting/backtest-data-validator.service";
import { BacktestEngine } from "../backtesting/backtest.engine";
import { BacktestMetricsService } from "../backtesting/backtest-metrics.service";
import { BacktestService } from "../backtesting/backtest.service";
import { TradeSimulator } from "../backtesting/trade.simulator";
import { env } from "../config/env";
import { MarketDataService } from "../data/market-data.service";
import { SqlService } from "../database/sql.service";
import { BacktestRepository } from "../repositories/backtest.repository";
import { CandleRepository } from "../repositories/candle.repository";
import { HybridStrategy } from "../strategy/hybrid.strategy";
import { configureScriptLogging } from "./script-logging.utils";
import {
  isSummaryMode,
  summarizeBacktestResult
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

  const sql =
    new SqlService();
  const strategy =
    new HybridStrategy();
  const service =
    new BacktestService(
      new BacktestEngine(
        new MarketDataService(
          new CandleRepository(sql)
        ),
        strategy,
        new TradeSimulator(),
        new BacktestDataValidatorService(),
        {
          initialCapital:
            env.backtest.initialCapital
        }
      ),
      new BacktestMetricsService(),
      strategy,
      new BacktestRepository(sql),
      {
        initialCapital:
          env.backtest.initialCapital
      }
    );
  const result =
    await service.execute(
      from,
      to
    );
  const output =
    isSummaryMode(args.summary)
      ? summarizeBacktestResult(
        result
      )
      : result;

  console.log(
    JSON.stringify(
      output,
      null,
      2
    )
  );
}

main();
