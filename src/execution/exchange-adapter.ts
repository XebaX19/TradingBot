import { OrderExecutionResult, OrderIntent } from "../models/order.model";

/**
 * Contrato desacoplado del exchange.
 *
 * Punto critico:
 * La estrategia no debe conocer Binance ni ningun broker. Todo envio de orden
 * pasa por un adaptador para poder cambiar de paper a live sin tocar las reglas
 * cuantitativas.
 */
export interface ExchangeAdapter {
  placeOrder(
    intent: OrderIntent
  ): Promise<OrderExecutionResult>;
}
