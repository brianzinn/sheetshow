import fs from 'fs';
import { exit } from 'process';

import { Auth } from 'googleapis';
import dotenv from 'dotenv';

import { executeQuery, getSnowflakeConnection } from './snowflake';
import { createClient, getSpreadsheet } from './googleSheets';

dotenv.config();

type ColumnLookup = {
  /**
   * ie: 'A', 'G' or 'AA'.
   */
  excelColumn: string,
  /**
   * Where to store this in selected database table (column name).
   */
  tableColumnName: string
}

type SnowSheetConfig = {
  name: string
  /**
   * You get this id from the URL when viewing a spreadsheet in the browser.
   */
  spreadsheetId: string
  /**
   * Something like "Sheet Name!A2:H" get columns A-H starting on row2 (skips headers).
   * You can get row 1 if you want and use the header names as well.
   */
  range?: string
  /**
   * Table name in snowflake
   */
  snowflakeTable: string
  /**
   * Mapping from Excel Columns (letter) to Snowflake table column name.
   */
  columnMap: ColumnLookup[]
}

/**
 * Convert a letter like "A" to 0 and "B" to 1.
 *
 * @param letter column letter like "A", "B" or "AA" to convert to a number
 * @param rangeCharacter where your range starts for inferring the row index.
 */
const letterToIndex = (letter: string, rangeCharacter = 'A'): number => {
  let column = 0;
  const firstIndex = rangeCharacter.charCodeAt(0);
  const length = letter.length;
  for (let i = 0; i < length; i++) {
    column += (letter.charCodeAt(i) - firstIndex) * Math.pow(26, length - i - 1);
  }
  return column;
}

/**
 * These can be input to the function or retrieved from data configuration/store, etc.
 */
const snowsheetConfig: SnowSheetConfig = {
  name: process.env.SPREADSHEET_NAME,
  spreadsheetId: process.env.SPREADSHEET_ID,
  range: process.env.SPREADSHEET_RANGE,
  snowflakeTable: process.env.SNOWFLAKE_TABLE,
  columnMap: [
    {
      excelColumn: 'A',
      tableColumnName: 'COL1'
    }, {
      excelColumn: 'B',
      tableColumnName: 'COL2'
    }, {
      excelColumn: 'H',
      tableColumnName: ''
    },
  ]
}

/**
 * Weak check for harmful SQL.  Lock down your callers and verify signature.
 *
 * @param input string to check
 */
const basicTextCheck = (input: string) => {
  const badCharacters = /[^_A-Za-z]/.exec(snowsheetConfig.snowflakeTable);
  if (badCharacters !== null) {
    console.error('found bad characters in :', badCharacters);
    throw new Error(`bad characters found in ${snowsheetConfig.snowflakeTable}`);
  }

  return input;
}

const uploadSpreadsheet = async (auth: Auth.GoogleAuth) => {
  // Use a least privilege account. My account only has access to raw tables from sheets.
  const connection = await getSnowflakeConnection();

  console.log(`Retrieving spreadsheet '${snowsheetConfig.name}'`);
  const result = await getSpreadsheet(auth, snowsheetConfig.spreadsheetId, snowsheetConfig.range);

  const rows = result.data.values;
  if (rows.length) {
    console.log(`loaded '${rows.length}' rows...`);
    const columns = snowsheetConfig.columnMap.map(c => basicTextCheck(c.tableColumnName)).join(',');
    const values = Array(snowsheetConfig.columnMap.length).fill('?').join(',');
    const sqlText = `INSERT INTO ${snowsheetConfig.snowflakeTable}(${columns}) VALUES (${values});`;

    const orderedRowIndex: number[] = [];
    for(const columnMap of snowsheetConfig.columnMap) {
      orderedRowIndex.push(letterToIndex(columnMap.excelColumn));
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results: any[][] = [];
    for(let i=0; i<rows.length;i++) {
      const row = rows[i];
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      results.push(orderedRowIndex.map(excelIndex => row[excelIndex]))
    }

    const truncateSQL = `TRUNCATE ${basicTextCheck(snowsheetConfig.snowflakeTable)};`;
    const truncateTableResponse = await executeQuery(connection, truncateSQL)
    console.log(`TRUNCATE table with '${truncateSQL}' ${JSON.stringify(truncateTableResponse)}`);
    const response = await executeQuery(connection, sqlText, results);
    console.log(`INSERT rows ${sqlText} response is '${JSON.stringify(response)}'`);
  } else {
    console.warn("No rows found.");
  }
}

void (async (): Promise<void> => {
  try {
    console.time('total-duration');
    const fileContents: Buffer = fs.readFileSync('credentials.json');
    // Authorize a client with credentials, then call the Google Sheets API.
    const client = createClient(JSON.parse(fileContents.toString()));
    await uploadSpreadsheet(client);
  } catch (e) {
    console.error(e);
  } finally {
    console.timeEnd('total-duration');
    exit();
  }
})();
