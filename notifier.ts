
import { TaskSchedule } from './task-schedule';

export class Notifier {
    static create(
        googleSheetId: string,
        scheduleName: string,
        tasksName: string,
        contactSheetName: string
    ): Promise<Notifier> {
        return TaskSchedule.create(
                googleSheetId,
                scheduleName,
                tasksName,
                contactSheetName
            )
            .then(taskSchedule => new Notifier(taskSchedule));
    }

    private constructor(private taskSchedule: TaskSchedule) {
        console.log(this.taskSchedule);
    }

    start() {

    }
}
