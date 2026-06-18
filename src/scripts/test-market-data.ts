import { SqlService } from "../database/sql.service";
import { CandleRepository } from "../repositories/candle.repository";
import { MarketDataService } from "../data/market-data.service";

async function main() {
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
