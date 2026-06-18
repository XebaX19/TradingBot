import { env } from "../config/env";
import { OrderRepository } from "../repositories/order.repository";
import {
  OrderExecutionResult,
  OrderIntent,
  TradingMode
} from "../models/order.model";
import { TradeSignal } from "../models/trade-signal.model";
import { ExchangeAdapter } from "./exchange-adapter";
import { PaperExchangeAdapter } from "./paper-exchange.adapter";
import { RiskManager } from "./risk-manager";

export interface OrderExecutorConfig {
  mode: TradingMode;
  liveTradingEnabled: boolean;
  paperCapital: number;
  liveCapital: number;
}

export class OrderExecutorService {
  constructor(
    private riskManager: RiskManager,
    private orderRepository: OrderRepository,
    private paperAdapter: ExchangeAdapter = new PaperExchangeAdapter(),
    private liveAdapter?: ExchangeAdapter,
    private config: OrderExecutorConfig = {
      mode: env.execution.mode,
      liveTradingEnabled:
        env.execution.liveTradingEnabled,
      paperCapital:
        env.execution.paperCapital,
      liveCapital:
        env.execution.liveCapital
    }
  ) { }

  /**
   * Orquesta la capa de ejecucion sin contaminar el strategy worker con
   * detalles de riesgo, broker o persistencia de ordenes.
   */
  async handleSignal(
    signal: TradeSignal
  ) {
    switch (this.config.mode) {
      case "signal-only":
        return this.persistSkippedSignal(
          signal,
          "Trading mode is signal-only"
        );
      case "paper-trading":
        return this.executePaperTrade(
          signal
        );
      case "live-trading":
        return this.executeLiveTrade(
          signal
        );
      default:
        return this.persistSkippedSignal(
          signal,
          "Unknown trading mode"
        );
    }
  }

  private async executePaperTrade(
    signal: TradeSignal
  ) {
    const decision =
      this.riskManager.evaluatePaperTrade(
        signal,
        this.config.paperCapital
      );

    if (!decision.approved) {
      return this.persistSkippedSignal(
        signal,
        decision.reason
      );
    }

    const intent: OrderIntent = {
      signal,
      mode: "paper-trading",
      quantity: decision.quantity,
      expectedPrice:
        signal.entryPrice
    };

    return this.executeIntent(
      intent,
      this.paperAdapter
    );
  }

  private async executeLiveTrade(
    signal: TradeSignal
  ) {
    if (!this.config.liveTradingEnabled) {
      return this.persistSkippedSignal(
        signal,
        "Live trading mode requested but LIVE_TRADING_ENABLED is false"
      );
    }

    if (!this.liveAdapter) {
      return this.persistSkippedSignal(
        signal,
        "No live exchange adapter configured"
      );
    }

    const decision =
      this.riskManager.evaluateLiveTrade(
        signal,
        this.config.liveCapital
      );

    if (!decision.approved) {
      return this.persistSkippedSignal(
        signal,
        decision.reason
      );
    }

    const intent: OrderIntent = {
      signal,
      mode: "live-trading",
      quantity: decision.quantity,
      expectedPrice:
        signal.entryPrice
    };

    return this.executeIntent(
      intent,
      this.liveAdapter
    );
  }

  private async executeIntent(
    intent: OrderIntent,
    adapter: ExchangeAdapter
  ) {
    const orderId =
      await this.orderRepository.createOrder({
        signalId: intent.signal.signalId,
        symbol: intent.signal.symbol,
        side: intent.signal.side,
        mode: intent.mode,
        expectedPrice: intent.expectedPrice,
        quantity: intent.quantity,
        status: "PENDING",
        detail: "Order intent created"
      });

    try {
      const execution =
        await adapter.placeOrder(intent);

      await this.orderRepository.updateOrderStatus(
        orderId,
        execution.status,
        execution.detail
      );
      await this.orderRepository.saveExecution(
        orderId,
        execution
      );

      return execution;
    }
    catch (error) {
      const execution: OrderExecutionResult = {
        status: "FAILED",
        detail:
          error instanceof Error
            ? error.message
            : "Unknown execution error"
      };

      await this.orderRepository.updateOrderStatus(
        orderId,
        execution.status,
        execution.detail
      );
      await this.orderRepository.saveExecution(
        orderId,
        execution
      );

      return execution;
    }
  }

  private async persistSkippedSignal(
    signal: TradeSignal,
    detail: string
  ) {
    const orderId =
      await this.orderRepository.createOrder({
        signalId: signal.signalId,
        symbol: signal.symbol,
        side: signal.side,
        mode: this.config.mode,
        expectedPrice: signal.entryPrice,
        quantity: 0,
        status: "SKIPPED",
        detail
      });

    const execution: OrderExecutionResult = {
      status: "SKIPPED",
      detail
    };

    await this.orderRepository.saveExecution(
      orderId,
      execution
    );

    return execution;
  }
}
