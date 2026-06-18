import { SqlService } from "../database/sql.service";
import { CandleRepository } from "../repositories/candle.repository";
import { MarketDataService } from "../data/market-data.service";
import { HybridStrategy } from "../strategy/hybrid.strategy";

async function main() {
  const marketData =
    new MarketDataService(
      new CandleRepository(
        new SqlService()
      )
    );

  const hourly =
    await marketData.getHourlyCandles(
      5000
    );

  const daily =
    await marketData.getDailyCandles(
      250
    );

  const strategy = new HybridStrategy();

  const signal =
    strategy.evaluate(
      hourly,
      daily
    );

  console.log(
    JSON.stringify(
      signal,
      null,
      2
    )
  );
}

main();
