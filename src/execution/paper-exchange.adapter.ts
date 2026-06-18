import { ExchangeAdapter } from "./exchange-adapter";
import { OrderExecutionResult, OrderIntent } from "../models/order.model";

export class PaperExchangeAdapter
  implements ExchangeAdapter {
  /**
   * Simula una ejecucion inmediata al precio esperado. Es intencionalmente
   * simple: el objetivo es validar el lifecycle operativo antes de live trading.
   */
  async placeOrder(
    intent: OrderIntent
  ): Promise<OrderExecutionResult> {
    return {
      status: "FILLED",
      exchangeOrderId:
        `paper-${intent.signal.signalId}`,
      executedPrice:
        intent.expectedPrice,
      executedQuantity:
        intent.quantity,
      detail: "Paper order filled immediately"
    };
  }
}
