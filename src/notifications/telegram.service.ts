import axios from "axios";
import { env } from "../config/env";
import { TradeSignal } from "../models/trade-signal.model";
import { logger } from "../shared/logger";

export class TelegramService {
  constructor(
    private config = env.telegram
  ) { }

  isConfigured() {
    return (
      this.config.enabled &&
      this.config.botToken.trim() !== "" &&
      this.config.chatId.trim() !== ""
    );
  }

  /**
   * Envia un mensaje libre para pruebas manuales o alertas operativas simples.
   */
  async sendMessage(
    text: string
  ) {
    if (!this.isConfigured()) {
      logger.warn(
        "Telegram notification skipped because TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is missing"
      );
      return false;
    }

    const payload = {
      chat_id:
        this.config.chatId,
      text,
      parse_mode: "HTML"
    };

    await axios.post(
      this.buildApiUrl("sendMessage"),
      payload,
      {
        timeout: 10000
      }
    );

    return true;
  }

  /**
   * Formatea una senal con suficiente contexto operativo para revision humana.
   */
  async sendSignalNotification(
    signal: TradeSignal
  ) {
    const message =
      this.formatSignalMessage(
        signal
      );

    return this.sendMessage(
      message
    );
  }

  private buildApiUrl(
    method: string
  ) {
    return `https://api.telegram.org/bot${this.config.botToken}/${method}`;
  }

  private formatSignalMessage(
    signal: TradeSignal
  ) {
    const rsi =
      signal.indicators.rsi === null
        ? "N/A"
        : signal.indicators.rsi.toFixed(2);
    const ema200 =
      signal.indicators.ema200 === null
        ? "N/A"
        : signal.indicators.ema200.toFixed(2);
    const reasons =
      signal.reason.length === 0
        ? "Sin detalle"
        : signal.reason.map(
          reason => `- ${reason}`
        ).join("\n");

    return [
      "<b>BTC BUY SIGNAL</b>",
      "",
      `<b>Symbol:</b> ${signal.symbol}`,
      `<b>Price:</b> ${signal.entryPrice.toFixed(2)} USD`,
      `<b>Drop:</b> -${signal.indicators.dropPercent.toFixed(2)}%`,
      `<b>RSI:</b> ${rsi}`,
      `<b>EMA200:</b> ${ema200}`,
      `<b>Volume Ratio:</b> ${signal.indicators.volumeRatio.toFixed(2)}`,
      `<b>Stop Loss:</b> ${signal.stopLoss.toFixed(2)} USD`,
      `<b>Take Profit:</b> ${signal.takeProfit.toFixed(2)} USD`,
      `<b>Risk/Reward:</b> ${signal.risk.riskReward.toFixed(2)}`,
      `<b>Timestamp:</b> ${signal.timestamp.toISOString()}`,
      "",
      "<b>Reasons:</b>",
      reasons
    ].join("\n");
  }
}
