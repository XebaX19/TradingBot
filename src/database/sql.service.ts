import sql, { type ConnectionPool } from "mssql";
import { env } from "../config/env";


export class SqlService {

  private pool?: ConnectionPool;

  async connect() {
    this.pool =
      await sql.connect({
        server: env.sql.server,
        database: env.sql.database,
        user: env.sql.user,
        password: env.sql.password,
        port: env.sql.port,
        options: {
          encrypt: false,
          trustServerCertificate: true
        }
      });
  }

  async query(query: string, params: any = {}) {
    if (!this.pool)
      await this.connect();

    const request = this.pool!.request();

    Object.keys(params)
      .forEach(key => {
        request.input(
          key,
          params[key]
        )
      });

    return request.query(query);
  }
}
