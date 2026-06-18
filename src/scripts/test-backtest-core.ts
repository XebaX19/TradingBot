import assert from "node:assert/strict";
import { BacktestDataValidatorService } from "../backtesting/backtest-data-validator.service";
import { TradeSimulator } from "../backtesting/trade.simulator";
import { Candle } from "../models/candle.model";
import { TradeSignal } from "../models/trade-signal.model";

function buildCandle(
  hour: number,
  overrides: Partial<Candle> = {}
): Candle {
  return {
    symbol: "BTCUSDT",
    timeframe: "1h",
    openTime: new Date(Date.UTC(2024, 0, 1, hour, 0, 0, 0)),
    open: 100,
    high: 101,
    low: 99,
    close: 100,
    volume: 10,
    ...overrides
  };
}

function buildSignal(): TradeSignal {
  return {
    signalId: "signal-1",
    type: "BUY_SIGNAL",
    symbol: "BTCUSDT",
    side: "BUY",
    entryPrice: 100,
    stopLoss: 97,
    takeProfit: 105,
    timestamp: new Date(Date.UTC(2024, 0, 1, 0, 0, 0, 0)),
    strategy: "HYBRID_RSI_EMA200",
    indicators: {
      rsi: 30,
      ema200: 90,
      dropPercent: 8,
      volumeRatio: 1.2
    },
    risk: {
      stopLossPercent: 3,
      takeProfitPercent: 5,
      riskReward: 5 / 3
    },
    reason: [
      "Precio sobre EMA200"
    ]
  };
}

function testDatasetValidator() {
  const validator =
    new BacktestDataValidatorService();
  const report =
    validator.validate(
      [
        buildCandle(0),
        buildCandle(2)
      ],
      1
    );

  assert.equal(report.isValid, false);
  assert.equal(report.gapCount, 1);
}

function testStopLossPriority() {
  const simulator =
    new TradeSimulator({
      maxHoldingCandles: 10,
      commissionPercent: 0,
      slippagePercent: 0,
      positionSizePercent: 10
    });
  const result =
    simulator.simulate(
      buildSignal(),
      [
        buildCandle(1, {
          open: 100,
          high: 106,
          low: 96,
          close: 102
        })
      ],
      10000
    );

  assert.ok(result);
  assert.equal(result.trade.exitReason, "STOP_LOSS");
  assert.equal(result.trade.result, "LOSS");
}

function testFloatingCurve() {
  const simulator =
    new TradeSimulator({
      maxHoldingCandles: 10,
      commissionPercent: 0,
      slippagePercent: 0,
      positionSizePercent: 10
    });
  const result =
    simulator.simulate(
      buildSignal(),
      [
        buildCandle(1, {
          open: 100,
          high: 103,
          low: 99,
          close: 102
        }),
        buildCandle(2, {
          open: 102,
          high: 106,
          low: 101,
          close: 105
        })
      ],
      10000
    );

  assert.ok(result);
  assert.equal(result.equityPoints.length, 2);
  assert.equal(result.trade.holdingCandles, 2);
  assert.ok(result.trade.maxFavorableExcursionPercent > 0);
}

function main() {
  testDatasetValidator();
  testStopLossPriority();
  testFloatingCurve();

  console.log("Backtest core tests passed");
}

main();
