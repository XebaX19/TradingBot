import minimist from "minimist";
import { BacktestMetricsService } from "../backtesting/backtest-metrics.service";
import { StrategyOptimizerService } from "../backtesting/strategy-optimizer.service";
import { StrategyValidatorService } from "../backtesting/strategy-validator.service";
import { StrategyParameterGrid } from "../models/optimization.model";
import { SqlService } from "../database/sql.service";
import { CandleRepository } from "../repositories/candle.repository";
import { MarketDataService } from "../data/market-data.service";
import { OptimizationRepository } from "../repositories/optimization.repository";

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
      parseNumberList(
        args.drop,
        [5, 7, 8, 10, 12]
      ),
    rsiLimit:
      parseNumberList(
        args.rsi,
        [25, 30, 35]
      ),
    volumeMultiplier:
      parseNumberList(
        args.volume,
        [1]
      ),
    takeProfitPercent:
      parseNumberList(
        args.tp,
        [3, 5, 8]
      ),
    stopLossPercent:
      parseNumberList(
        args.sl,
        [2, 3, 5]
      )
  };
}

async function main() {
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
  const top =
    args.top === undefined
      ? 10
      : Number(args.top);

  const sql =
    new SqlService();
  const marketData =
    new MarketDataService(
      new CandleRepository(sql)
    );
  const optimizer =
    new StrategyOptimizerService(
      new StrategyValidatorService(
        marketData,
        new BacktestMetricsService()
      ),
      new OptimizationRepository(sql)
    );
  const result =
    await optimizer.optimize(
      from,
      to,
      buildGrid(),
      splitRatio
    );

  console.log(
    JSON.stringify(
      {
        split: result.split,
        bestCandidate:
          result.bestCandidate,
        bestOverallCandidate:
          result.bestOverallCandidate,
        topCandidates:
          result.rankedCandidates.slice(0, top)
      },
      null,
      2
    )
  );
}

main();
