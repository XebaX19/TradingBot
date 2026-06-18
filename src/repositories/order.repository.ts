import { SqlService } from "../database/sql.service";
import {
  OrderExecutionResult,
  OrderRecord,
  OrderStatus
} from "../models/order.model";

export class OrderRepository {
  constructor(
    private sql: SqlService
  ) { }

  async createOrder(
    order: OrderRecord
  ) {
    const result =
      await this.sql.query(
        `
        INSERT INTO orders
        (
          signal_id,
          symbol,
          side,
          trading_mode,
          expected_price,
          quantity,
          status,
          detail
        )
        OUTPUT INSERTED.id AS id
        VALUES
        (
          @signalId,
          @symbol,
          @side,
          @mode,
          @expectedPrice,
          @quantity,
          @status,
          @detail
        )
        `,
        order
      );

    return result.recordset[0].id as number;
  }

  async updateOrderStatus(
    orderId: number,
    status: OrderStatus,
    detail: string
  ) {
    await this.sql.query(
      `
      UPDATE orders
      SET
        status = @status,
        detail = @detail,
        updated_at = SYSUTCDATETIME()
      WHERE id = @orderId
      `,
      {
        orderId,
        status,
        detail
      }
    );
  }

  async saveExecution(
    orderId: number,
    execution: OrderExecutionResult
  ) {
    await this.sql.query(
      `
      INSERT INTO order_executions
      (
        order_id,
        status,
        exchange_order_id,
        executed_price,
        executed_quantity,
        detail,
        raw_response
      )
      VALUES
      (
        @orderId,
        @status,
        @exchangeOrderId,
        @executedPrice,
        @executedQuantity,
        @detail,
        @rawResponse
      )
      `,
      {
        orderId,
        status: execution.status,
        exchangeOrderId:
          execution.exchangeOrderId,
        executedPrice:
          execution.executedPrice,
        executedQuantity:
          execution.executedQuantity,
        detail:
          execution.detail,
        rawResponse:
          execution.rawResponse
      }
    );
  }
}
