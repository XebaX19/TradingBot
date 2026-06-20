import minimist from "minimist";
import { BacktestMetricsService } from "../backtesting/backtest-metrics.service";
import { StrategyOptimizerService } from "../backtesting/strategy-optimizer.service";
import { StrategyValidatorService } from "../backtesting/strategy-validator.service";
import { WalkForwardService } from "../backtesting/walk-forward.service";
import { StrategyParameterGrid } from "../models/optimization.model";
import { SqlService } from "../database/sql.service";
import { CandleRepository } from "../repositories/candle.repository";
import { MarketDataService } from "../data/market-data.service";
import { configureScriptLogging } from "./script-logging.utils";
import { ScriptProgressBar } from "./script-progress.utils";
import {
  isSummaryMode,
  summarizeWalkForwardResult
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

function parseNumberList(
  value: string | undefined,
  fallback: number[]
) {
  if (!value) {
    return fallback;
  }

  return value
    .split(",")
    .map(part => Number(part.trim()))
    .filter(number => Number.isFinite(number));
}

function buildGrid(): StrategyParameterGrid {
  return {
    dropPercent:
      parseNumberList(args.drop, [5, 7, 8, 10, 12]),
    rsiLimit:
      parseNumberList(args.rsi, [25, 30, 35]),
    volumeMultiplier:
      parseNumberList(args.volume, [1, 1.2]),
    takeProfitPercent:
      parseNumberList(args.tp, [3, 5, 8]),
    stopLossPercent:
      parseNumberList(args.sl, [2, 3, 5])
  };
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
  const trainDays =
    Number(args.trainDays || 730);
  const validationDays =
    Number(args.validationDays || 180);
  const stepDays =
    Number(args.stepDays || 90);

  const marketData =
    new MarketDataService(
      new CandleRepository(
        new SqlService()
      )
    );
  const walkForward =
    new WalkForwardService(
      new StrategyOptimizerService(
        new StrategyValidatorService(
          marketData,
          new BacktestMetricsService()
        )
      )
    );
  const oneDayMs =
    24 * 60 * 60 * 1000;
  const totalWindows =
    Math.max(
      0,
      Math.floor(
        (
          to.getTime() -
          (
            from.getTime() +
            ((trainDays + validationDays) * oneDayMs) -
            oneDayMs
          )
        ) /
        (stepDays * oneDayMs)
      ) + 1
    );
  const progress =
    new ScriptProgressBar();

  progress.stage(
    `Preparing walk-forward windows (${totalWindows})...`
  );
  progress.start(
    Math.max(1, totalWindows),
    "walk-forward"
  );
  const result =
    await walkForward.run(
      from,
      to,
      buildGrid(),
      trainDays,
      validationDays,
      stepDays,
      {
        onWindowEvaluated: (
          _current,
          _total,
          window,
          optimization
        ) => {
          progress.advance(
            `window=${window.index} robust=${optimization.bestCandidate ? "yes" : "no"}`
          );
        }
      }
    );
  progress.finish("done");
  const output =
    isSummaryMode(args.summary)
      ? summarizeWalkForwardResult(
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
