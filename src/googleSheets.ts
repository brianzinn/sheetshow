import { google, Auth, sheets_v4, Common } from 'googleapis';
import { GaxiosResponse } from 'gaxios';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];

/**
 * Create an OAuth2 client with the given credentials.
 *
 * @param {Auth.CredentialBody} credentials The authorization client credentials.
 */
export const createClient = (credentials: Auth.CredentialBody): Auth.GoogleAuth => {
  const oAuth2Client = new google.auth.GoogleAuth({
    // Scopes can be specified either as an array or as a single, space-delimited string.
    scopes: SCOPES,
    credentials
  });
  return oAuth2Client;
}

/**
 * 
 * @param auth auth client
 * @param spreadsheetId id can be retrieved from the spreadsheet URL when viewing
 * @param range something like "Sheet Name!A2:H" get columns A-H starting on row2 (skips headers).
 */
export const getSpreadsheet = (auth: Auth.GoogleAuth, spreadsheetId: string, range: string): Common.GaxiosPromise<sheets_v4.Schema$ValueRange> => {
  return new Promise<GaxiosResponse<sheets_v4.Schema$ValueRange>>((resolve, reject) => {
    const sheets = google.sheets({ version: 'v4', auth });

    sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    }, (err, res) => {
      if (err) {
        console.log('The API returned an error: ', err);
        reject(err);
        return;
      }
      resolve(res);
    });
  })
}