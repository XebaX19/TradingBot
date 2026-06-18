import path from "path";
import dotenv from "dotenv";

// Carga variables de ambiente segun el entorno activo.
const environment =
  process.env.NODE_ENV?.trim() || "development";

dotenv.config({
  path: path.resolve(
    process.cwd(),
    `${environment}.env`
  )
});

function getNumber(
  value: string | undefined,
  fallback: number
) {
  if (
    value === undefined ||
    value.trim() === ""
  ) {
    return fallback;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : fallback;
}

function getBoolean(
  value: string | undefined,
  fallback: boolean
) {
  if (
    value === undefined ||
    value.trim() === ""
  ) {
    return fallback;
  }

  return value.trim().toLowerCase() === "true";
}

export const env = {
  sql: {
    server: process.env.SQL_SERVER!,
    database: process.env.SQL_DATABASE!,
    user: process.env.SQL_USER!,
    password: process.env.SQL_PASSWORD!,
    port: process.env.SQL_PORT
      ? Number(process.env.SQL_PORT)
      : undefined
  },

  binance: {
    url: process.env.BINANCE_URL!
  },

  market: {
    symbol: process.env.SYMBOL || "BTCUSDT",
    timeframe: process.env.TIMEFRAME || "1h"
  },

  strategy: {
    dropPercent: getNumber(
      process.env.STRATEGY_DROP_PERCENT,
      8
    ),
    rsiPeriod: getNumber(
      process.env.STRATEGY_RSI_PERIOD,
      14
    ),
    rsiLimit: getNumber(
      process.env.STRATEGY_RSI_LIMIT,
      35
    ),
    volumeMultiplier: getNumber(
      process.env.STRATEGY_VOLUME_MULTIPLIER,
      1
    ),
    volumeLookbackCandles: getNumber(
      process.env.STRATEGY_VOLUME_LOOKBACK_CANDLES,
      20
    ),
    recentHighLookbackCandles: getNumber(
      process.env.STRATEGY_RECENT_HIGH_LOOKBACK_CANDLES,
      24 * 7
    ),
    takeProfitPercent: getNumber(
      process.env.STRATEGY_TAKE_PROFIT_PERCENT,
      5
    ),
    stopLossPercent: getNumber(
      process.env.STRATEGY_STOP_LOSS_PERCENT,
      3
    ),
    maxHoldingCandles: getNumber(
      process.env.STRATEGY_MAX_HOLDING_CANDLES,
      24 * 30
    )
  },

  backtest: {
    initialCapital: getNumber(
      process.env.BACKTEST_INITIAL_CAPITAL,
      10000
    ),
    positionSizePercent: getNumber(
      process.env.BACKTEST_POSITION_SIZE_PERCENT,
      10
    ),
    commissionPercent: getNumber(
      process.env.BACKTEST_COMMISSION_PERCENT,
      0.1
    ),
    slippagePercent: getNumber(
      process.env.BACKTEST_SLIPPAGE_PERCENT,
      0.05
    ),
    minTradeNotional: getNumber(
      process.env.BACKTEST_MIN_TRADE_NOTIONAL,
      10
    ),
    quantityStep: getNumber(
      process.env.BACKTEST_QUANTITY_STEP,
      0.00001
    )
  },

  execution: {
    mode:
      (
        process.env.TRADING_MODE ||
        "signal-only"
      ) as "signal-only" | "paper-trading" | "live-trading",
    liveTradingEnabled:
      getBoolean(
        process.env.LIVE_TRADING_ENABLED,
        false
      ),
    paperCapital: getNumber(
      process.env.PAPER_TRADING_CAPITAL,
      10000
    ),
    liveCapital: getNumber(
      process.env.LIVE_TRADING_CAPITAL,
      10000
    ),
    paperPositionSizePercent: getNumber(
      process.env.PAPER_POSITION_SIZE_PERCENT,
      10
    ),
    livePositionSizePercent: getNumber(
      process.env.LIVE_POSITION_SIZE_PERCENT,
      5
    )
  }
};
