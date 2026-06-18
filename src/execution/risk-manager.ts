import { env } from "../config/env";
import { ExecutionDecision } from "../models/order.model";
import { TradeSignal } from "../models/trade-signal.model";

export interface RiskManagerConfig {
  paperPositionSizePercent: number;
  livePositionSizePercent: number;
}

export class RiskManager {
  constructor(
    private config: RiskManagerConfig = {
      paperPositionSizePercent:
        env.execution.paperPositionSizePercent,
      livePositionSizePercent:
        env.execution.livePositionSizePercent
    }
  ) { }

  /**
   * Traduce una senal en una decision operativa. El sizing sigue desacoplado de
   * la estrategia para poder modificar riesgo sin reescribir las reglas de
   * entrada.
   */
  evaluatePaperTrade(
    signal: TradeSignal,
    capital: number
  ): ExecutionDecision {
    return this.evaluate(
      signal,
      capital,
      this.config.paperPositionSizePercent
    );
  }

  evaluateLiveTrade(
    signal: TradeSignal,
    capital: number
  ): ExecutionDecision {
    return this.evaluate(
      signal,
      capital,
      this.config.livePositionSizePercent
    );
  }

  private evaluate(
    signal: TradeSignal,
    capital: number,
    positionSizePercent: number
  ): ExecutionDecision {
    if (capital <= 0) {
      return {
        approved: false,
        reason: "Capital must be positive",
        quantity: 0
      };
    }

    if (signal.entryPrice <= 0) {
      return {
        approved: false,
        reason: "Signal entry price must be positive",
        quantity: 0
      };
    }

    const positionNotional =
      capital *
      (positionSizePercent / 100);
    const quantity =
      positionNotional / signal.entryPrice;

    if (quantity <= 0) {
      return {
        approved: false,
        reason: "Calculated quantity must be positive",
        quantity: 0
      };
    }

    return {
      approved: true,
      reason: "Risk checks passed",
      quantity
    };
  }
}
