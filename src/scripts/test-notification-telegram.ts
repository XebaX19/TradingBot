import minimist from "minimist";
import { TelegramService } from "../notifications/telegram.service";

const args =
  minimist(
    process.argv.slice(2)
  );

function buildMessage() {
  const text =
    args.message ||
    args.text;

  if (
    typeof text === "string" &&
    text.trim() !== ""
  ) {
    return text.trim();
  }

  return [
    "TradingBot Telegram test",
    `Environment: ${process.env.NODE_ENV || "development"}`,
    `Timestamp: ${new Date().toISOString()}`,
    "Status: notification pipeline reachable"
  ].join("\n");
}

async function main() {
  const telegram =
    new TelegramService();
  const sent =
    await telegram.sendMessage(
      buildMessage()
    );

  console.log(
    JSON.stringify(
      {
        sent,
        configured:
          telegram.isConfigured()
      },
      null,
      2
    )
  );
}

main();
