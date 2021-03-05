# sheetshow

## Google Sheets to Snowflake data warehouse (that works with shared team drives)

We have an account with Stitch data they state on their website the limitations of their saas offering (emphasis mine):
> `Spreadsheets from **shared Team Drives** aren’t currently supported. Permission and/or "File Not Found" errors will surface during extraction if you connect a spreadsheet from a shared Team Drive.`

I checked other sites like Zapier and talked with Hevo customer support, so at least for Shared Team Drives you will need to roll your own code looks like.  A nightly schedule will cost pennies per month to run serverless.

This is a basic end to end example - you just need to create a snowsheet config.  We have it running serverless on a schedule to nightly update a couple of spreadsheets.  We didn't have real-time requirements and the spreadsheets are relatively small.

I used TypeScript as it adds some useful type safety.  Working with `any[]` for Snowflake you could use Joi or some data/schema validation in production, but I left that as out to keep the example simple.

## Example usage
Here it took `6` seconds for `6` columns with `2800` rows:
```bash
yarn start
yarn run v1.13.0
warning ..\package.json: No license field
$ tsc --build
$ node .
Retrieving spreadsheet 'Your sheet name here'
loaded '2815' rows...
TRUNCATE table with 'TRUNCATE YOUR_TABLE;' [{"status":"Statement executed successfully."}]
INSERT rows INSERT INTO YOURTABLE (COL1, COL2, ...) VALUES (?,?,...); response is '[{"number of rows inserted":2815}]'
total-duration: 6.056s
```

You need to download the service account file from google.  Probably you will store it as a secret and load it in memory only, but for testing you can save here locally as "credentials.json".  File looks like:
```json
{
  "type": "service_account",
  "project_id": "your-google-project-id",
  "private_key_id": "<redacted>",
  "private_key": "-----BEGIN PRIVATE KEY-----\n<redacted>uTXw==\n-----END PRIVATE KEY-----\n",
  "client_email": "your-google-sheets-service-account@your-google-project-id.iam.gserviceaccount.com",
  "client_id": "<redacted>",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/<redacted>"
}
```

There is a VS Code launch config, so you can debug locally as well.  That can be helpful when sorting out Snowflake permissions. Don't forget to grant usage on warehouse, database, etc!

## My other shared Snowflake stuff
1. https://github.com/brianzinn/snowflake-ingest-node NPM for snowpipe API connector (Snowflake only supports Java and Python SDKs)
2. https://github.com/brianzinn/snowflake-cdc-example Serverless CDC example using mysql binlog for row level updates - pushed to snowflake via snowpipe

Made with ♥ by Brian Zinn