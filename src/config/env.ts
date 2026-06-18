import path from "path";
import dotenv from "dotenv";

//Carga variables de ambiente según entorno (development o production)
const environment = process.env.NODE_ENV?.trim() || 'development';
dotenv.config({
  path: path.resolve(process.cwd(), `${environment}.env`)
});

export const env = {
  sql: {
    server: process.env.SQL_SERVER!,
    database: process.env.SQL_DATABASE!,
    user: process.env.SQL_USER!,
    password: process.env.SQL_PASSWORD!,
    port: process.env.SQL_PORT ? Number(process.env.SQL_PORT) : undefined
  },

  binance: {
    url: process.env.BINANCE_URL!
  },

  market: {
    symbol: process.env.SYMBOL!,
    timeframe: process.env.TIMEFRAME!
  }
};
