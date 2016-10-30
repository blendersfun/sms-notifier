
declare module "googleapis" {

    var g: g.IGoogleApis;

    namespace g {
        interface IGoogleApisJWTClient {
            authorize: (callback?: (err, result) => any) => void
        }
        interface IGoogleApisAuth {
            JWT: new (email, keyFile, key, scopes, subject) => IGoogleApisJWTClient
        }
        interface IGoogleSheetsSpreadsheetsValues {
            get: (
                config: {
                    auth: IGoogleApisJWTClient,
                    spreadsheetId: string,
                    range: string
                },
                callback: (err, response) => void
            ) => void
        }
        interface IGoogleSheetsSpreadsheets {
            values: IGoogleSheetsSpreadsheetsValues
        }
        interface IGoogleSheets {
            spreadsheets: IGoogleSheetsSpreadsheets
        }
        interface IGoogleApis {
            auth: IGoogleApisAuth,
            sheets: (version) => IGoogleSheets
        }
    }

    export = g;
}