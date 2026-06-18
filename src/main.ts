import { SqlService } from "./database/sql.service";
import { CandleRepository } from "./repositories/candle.repository";
import { ReconciliationRepository } from "./repositories/reconciliation.repository";
import { BinanceClient } from "./data/binance.client";
import { CandleReconciliationService } from "./data/reconciliation.service";
import { CandleCollectorWorker } from "./workers/candle-collector.worker";
import { CandleReconciliationWorker } from "./workers/candle-reconciliation.worker";
import { StrategyWorker } from "./workers/strategy.worker";
import { MarketDataService } from "./data/market-data.service";
import { OrderExecutorService } from "./execution/order-executor.service";
import { RiskManager } from "./execution/risk-manager";
import { OrderRepository } from "./repositories/order.repository";
import { HybridStrategy } from "./strategy/hybrid.strategy";
import { SignalRepository } from "./repositories/signal.repository";

const sql = new SqlService();
const candleRepository = new CandleRepository(sql);
const binance = new BinanceClient();
const reconciliationService = new CandleReconciliationService(
  candleRepository,
  binance
);

//Worker Collector
const collector = new CandleCollectorWorker(
  candleRepository,
  binance,
  reconciliationService
);

collector.start();

//Worker Reconciliation
const reconciliation = new CandleReconciliationWorker(
  reconciliationService,
  new ReconciliationRepository(sql),
  candleRepository
);

reconciliation.start();

//Worker Strategy
const strategyWorker =
  new StrategyWorker(
    new MarketDataService(
      new CandleRepository(sql)
    ),
    new HybridStrategy(),
    new SignalRepository(sql),
    new OrderExecutorService(
      new RiskManager(),
      new OrderRepository(sql)
    )
  );

strategyWorker.start();
