import snowflakeSdk from 'snowflake-sdk';

type SnowflakeConnection = {
  account: string
  username: string
  password: string
  database: string
  /**
   * Selected after connecting.
   */
  schema?: string
  /**
   * Selected after connecting.
   */
  warehouse?: string
}

export const getSnowflakeConnection = (): Promise<snowflakeSdk.Connection> => {
  const snowflakeConnection: SnowflakeConnection = {
    account: process.env.SNOWFLAKE_ACCOUNT,
    username:  process.env.SNOWFLAKE_USERNAME,
    password:  process.env.SNOWFLAKE_PASSWORD,
    database:  process.env.SNOWFLAKE_DATABASE,
    schema:  process.env.SNOWFLAKE_SCHEMA,
    warehouse:  process.env.SNOWFLAKE_WAREHOUSE
  };

  return new Promise<snowflakeSdk.Connection>((resolve, reject) => {
    const connection = snowflakeSdk.createConnection(snowflakeConnection);
    connection.connect((err, conn) => {
      if (err) {
        console.error('Unable to connect: ' + err.message);
        reject(err);
      } else {
        resolve(conn);
      }
    });
  })
}

/**
 * 
 * @param snowflakeConnection snowflake SDK connection
 * @param sqlText text to run
 * @param input rows of data for the bulk insert "binds".
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const executeQuery = (snowflakeConnection: snowflakeSdk.Connection, sqlText: string, input?: any[][]): Promise<any[]> => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new Promise<any[]>((resolve, reject) => {
    snowflakeConnection.execute({
      sqlText,
      binds: input,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      complete: (err: Error, stmt: snowflakeSdk.Statement, rows: any[]) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(rows);
      }
    });
  });
}