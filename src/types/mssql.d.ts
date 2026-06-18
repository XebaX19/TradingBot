declare module "mssql" {
  export interface SqlConfig {
    server: string;
    database: string;
    user: string;
    password: string;
    port?: number;
    options?: {
      encrypt?: boolean;
      trustServerCertificate?: boolean;
    };
  }

  export interface QueryResult<T = any> {
    recordset: T[];
  }

  export class Request {
    input(name: string, value: unknown): Request;
    query<T = any>(query: string): Promise<QueryResult<T>>;
  }

  export class ConnectionPool {
    request(): Request;
  }

  export function connect(config: SqlConfig): Promise<ConnectionPool>;

  const sql: {
    connect: typeof connect;
  };

  export default sql;
}
