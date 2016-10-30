
import { GoogleSheets } from './google-sheets';

export class TaskSchedule {

    static create(
        googleSheetId: string,
        scheduleName: string,
        tasksName: string,
        contactSheetName: string
    ): Promise<TaskSchedule> {
        return GoogleSheets.create()
            .then((googleSheets: GoogleSheets) => {
                let selections = [`${scheduleName}!B1:F`, `${tasksName}!B1:F`, `${contactSheetName}!B1:F`];
                let promises = selections.map(selection => googleSheets.getSheetRange(googleSheetId, selection));
                return Promise.all(
                    [Promise.resolve(googleSheets)].concat(promises)
                );
            })
            .then((result) => {
                return new TaskSchedule(
                    googleSheetId,
                    result[0],
                    scheduleName,
                    tasksName,
                    contactSheetName,
                    result[1],
                    result[2],
                    result[3]
                );
            });
    }

    private constructor(
        private sheetId: string,
        private sheetsApi: GoogleSheets,
        private scheduleName: string,
        private tasksName: string,
        private contactSheetName: string,
        private schedule: any,
        private tasks: any,
        private contactSheet: any
    ) {}
}