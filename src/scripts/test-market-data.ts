import { SqlService } from "../database/sql.service";
import { CandleRepository } from "../repositories/candle.repository";
import { MarketDataService } from "../data/market-data.service";
import { configureScriptLogging } from "./script-logging.utils";

async function main() {
  configureScriptLogging(
    undefined,
    "info"
  );

  const service =
    new MarketDataService(
      new CandleRepository(
        new SqlService()
      )
    );

  const daily = await service.getDailyCandles(250);

  console.log(
    daily.slice(-5)
  );
}

main();
