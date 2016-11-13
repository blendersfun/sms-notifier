
import * as _ from 'lodash';
import * as moment from 'moment-timezone';
import {
    Sheet,
    ISheetConfig
} from './sheet';

export class Task {
    title: string;
    personCount: number;
    reminderTime: number;
    estimate: number;
    groups: string[]
}

export class TasksSheet extends Sheet<Task> {
    protected constructor(
        protected config: ISheetConfig<Task>
    ) {
        super(config);
    }



    // Transforms a string like 'Day Before: 5pm' into duration: the number
    // of hours before the actual time in which the assignment is due
    // (which is always at midnight on the date it is assigned).

    public static reminderTimeTx = d => {
        let split = d.split(/\:\s+/);
        let offsetName = split[0].toLowerCase();
        let time = parseInt(split[1].slice(0, split[1].length - 2));
        let period = split[1].slice(-2).toLowerCase();

        let hoursIn24Time = null;
        if (time === 12) {
            hoursIn24Time = period === 'am' ? 0 : 12;
        } else {
            hoursIn24Time = period === 'am' ? time : time + 12;
        }

        let offsetInHours = null;
        switch (offsetName) {
            case 'day before': offsetInHours = 24; break;
            case 'day of':     offsetInHours = 0; break;
        }

        return 24 - hoursIn24Time + offsetInHours;
    };

    protected static headings = {
        title:        { title: 'Title' },
        personCount:  { title: 'How Many',      transform: Sheet.intTx },
        reminderTime: { title: 'Reminder Time', transform: TasksSheet.reminderTimeTx },
        estimate:     { title: 'Estimate',      transform: Sheet.durationTx },
        groups:       { title: 'Group',         transform: Sheet.listTx }
    };

    protected static range = 'A1:H';

    protected static indexData<S>(data: S[]): { [indexValue: string]: S }  {
        return <{ [indexValue: string]: S }> _.transform(data, (result, row: S) => {
            let aliases = row['title'].split(/,\s+/g);
            _.each(aliases, alias => result[alias] = row);
        }, {});
    }

    public getTask(title): Task {
        return this.config.indexedData[title] || null;
    }
}
