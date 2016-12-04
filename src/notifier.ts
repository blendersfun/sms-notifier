
import * as config from 'config';
import * as _ from 'lodash';
import * as moment from 'moment-timezone';
import { TaskSchedule, ITaskScheduleConfig } from './task-schedule';
import { RestClient } from 'twilio';
import { FileUtils } from './file-utils';

export class Notifier {
    static create(
        googleSheetId: string,
        scheduleName: string,
        tasksName: string,
        contactSheetName: string
    ): Promise<Notifier> {
        let taskScheduleConfig = config.get<ITaskScheduleConfig>('greatHouseMaintenance');
        return Promise.all([
            TaskSchedule.create(taskScheduleConfig),
            FileUtils.loadJson('./secrets/secrets.json')
        ]).then(results => {
            let taskSchedule = results[0], secrets = results[1];
            let twilio = new RestClient(secrets['twilioAccountSid'], secrets['twilioAuthToken']);
            return new Notifier(taskSchedule, twilio);
        }).catch(e => {
            console.log('Notifier.create -- error', e.stack);
        })
    }

    private constructor(
        private taskSchedule: TaskSchedule,
        private twilio: RestClient
    ) {}

    start() {
        this.wake();
    }

    wake() {
        let taskScheduleConfig = config.get<ITaskScheduleConfig>('greatHouseMaintenance');

        let now = moment.tz(config.get<string>('timezone')).toDate();
        let nextHour = moment(now).add(1, 'hour').minutes(0).seconds(1).toDate();
        let napTime = nextHour.valueOf() - now.valueOf();

        TaskSchedule.create(taskScheduleConfig)
            .then(taskSchedule => {
                let currentReminders = this.taskSchedule.getCurrentReminders();
                if (config.get<boolean>('fakeSms')) {
                    let currentRemindersCount = Object.keys(currentReminders).length;
                    console.log('The current time is: ', now.toString());
                    console.log('The current reminders count is: ', currentRemindersCount);
                    if (currentRemindersCount) {
                        console.log('---');
                    }
                }
                _.each(currentReminders, (message, phoneNumber) => this.sendReminder(phoneNumber, message));

                setTimeout(() => this.wake(), napTime);
            })
            .catch((e) => {
                console.log('Error encountered in TaskSchedule.create() -- ', e.stack);
                // Do not fail to keep going just because something blew up.
                setTimeout(() => this.wake(), napTime);
            });


    }

    sendReminder(phoneNumber, messages: string|string[]) {
        if (!_.isArray(messages)) {
            messages = [<string> messages];
        }
        _.each(messages, message => {
            if (config.get<boolean>('fakeSms')) {
                console.log(phoneNumber, message);
                console.log('---');
            } else {
                this.twilio.messages.create({
                    body: message,
                    from: config.get<string>('twilioPhoneNumber'),
                    to: phoneNumber
                }, function(err, message) {
                    console.log(err, message && message.sid);
                });
            }
        });

    }
}
