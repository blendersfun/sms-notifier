
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
        });
    }

    private constructor(
        private taskSchedule: TaskSchedule,
        private twilio: RestClient
    ) {}

    start() {
        this.wake();
    }

    wake() {
        let currentReminders = this.taskSchedule.getCurrentReminders();
        _.each(currentReminders, (message, phoneNumber) => this.sendReminder(phoneNumber, message));

        let now = moment.tz(config.get<string>('timezone')).toDate();
        let nextHour = moment(now).add(1, 'hour').minutes(0).seconds(1).toDate();
        let napTime = nextHour.valueOf() - now.valueOf();

        setTimeout(() => this.wake(), napTime);
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
