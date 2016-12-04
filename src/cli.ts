
import * as config from 'config';
import { TaskSchedule, ITaskScheduleConfig } from './task-schedule';


let taskScheduleConfig = config.get<ITaskScheduleConfig>('greatHouseMaintenance');

TaskSchedule.create(taskScheduleConfig)
    .then(taskSchedule => {
        var command = process.argv[2];
        if (command === 'current') {
            let currentReminders = taskSchedule.getCurrentReminders();
            console.log('Current Reminders: ');
            console.log(currentReminders);
        } else if (command === 'mate-totals') {
            let mateTotals = taskSchedule.getRoommateTotals();
            console.log('Roommate Totals: ');
            console.log(mateTotals);
        } else if(command === 'mate-tasks') {
            let mateTasks = taskSchedule.getTasksByPerson();
            console.log('Roommate Tasks: ');
            console.log(mateTasks);
        } else {
            console.log('Commands:\n' +
                ' - "current" (current reminders), \n' +
                ' - "mate-totals" (roommate total completed time)');
        }
    })
    .catch((e) => {
        console.log('Error encountered in TaskSchedule.create() -- ', e.stack);
    });