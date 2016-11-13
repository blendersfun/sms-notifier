
import * as config from 'config';
import { FileUtils } from './file-utils';
import * as googleapis from 'googleapis';

export class GoogleSheets {
    private sheetsApi: googleapis.IGoogleSheets;

    static create(): Promise<GoogleSheets> {
        return FileUtils.loadJson(config.get<string>('serviceAccountConfigPath'))
            .then(json => {
                let jwtClient = new googleapis.auth.JWT(json['client_email'], null, json['private_key'], [
                    'https://www.googleapis.com/auth/spreadsheets'
                ], null);

                return new Promise((resolve, reject) => {
                    jwtClient.authorize(err => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(new GoogleSheets(jwtClient));
                        }
                    });
                });
            });
    }

    private constructor(
        private jwtClient: googleapis.IGoogleApisJWTClient
    ) {
        this.sheetsApi = googleapis.sheets('v4');
    }

    getSheetRange(sheetId, range): Promise<any> {
        return new Promise((resolve, reject) => {
            this.sheetsApi.spreadsheets.values.get(
                {
                    auth: this.jwtClient,
                    spreadsheetId: sheetId,
                    range: range
                },
                (err, result) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(result);
                    }
                });
        });
    }
}
