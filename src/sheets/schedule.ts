
import * as config from 'config';
import * as _ from 'lodash';
import * as moment from 'moment-timezone';
import {
    Sheet,
    ISheetConfig
} from './sheet';

export interface IGetAssignmentsConfig {
    pastDue?: boolean,
    complete?: boolean,
    reminderSent?: boolean
}

export class TaskAssignment {
    task: string;
    due: Date;
    people: string[];
    isCompleted: boolean;
    estimated: number;
    actual: number;
}

export class ScheduleSheet extends Sheet<TaskAssignment> {
    protected constructor(
        protected config: ISheetConfig<TaskAssignment>
    ) {
        super(config);
    }

    protected static headings = {
        task:        { title: 'Task' },
        due:         { title: 'Due', transform: Sheet.dateTx },
        people:      { title: 'Who', transform: Sheet.listTx },
        isCompleted: { title: 'Completed', transform: Sheet.booleanTx },
        estimated:   { title: 'Estimated', transform: Sheet.durationTx },
        actual:      { title: 'Actual',    transform: Sheet.durationTx }
    };

    protected static range = 'B1:G';

    private static defaultGetConfig: IGetAssignmentsConfig = {
        pastDue: null,
        complete: null,
        reminderSent: null
    };

    getAssignments(configObj?: IGetAssignmentsConfig): TaskAssignment[] {
        configObj = _.merge({}, ScheduleSheet.defaultGetConfig, configObj);
        let now = moment.tz(config.get<string>('timezone')).toDate();

        return this.config.data.filter((a: TaskAssignment) => {
            if (a.due === null) {
                return false; // Strip out comments in schedule.
            }
            if (configObj.complete !== null) {
                if (configObj.complete !== a.isCompleted) return false;
            }
            if (configObj.pastDue !== null) {
                let pastDue = a.due < now;
                if (configObj.pastDue !== pastDue) return false;
            }
            return true;
        });
    }
}