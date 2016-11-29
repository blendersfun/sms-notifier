
import * as config from 'config';
import * as _ from 'lodash';
import * as moment from 'moment-timezone';

import { ContactsSheet, Contact } from './sheets/contacts';
import { ScheduleSheet, TaskAssignment } from './sheets/schedule';
import { TasksSheet } from './sheets/tasks';
import { GoogleSheets } from './google-sheets';

export interface ITaskScheduleConfig {
    googleSheetId: string;
    scheduleName: string;
    tasksName: string;
    contactSheetName: string;
    tinyUrl: string;
}

export class TaskSchedule {
    static create(config: ITaskScheduleConfig): Promise<TaskSchedule> {
        return GoogleSheets.create()
            .then((api: GoogleSheets) => {
                let sheetId = config.googleSheetId;
                return Promise.all([
                    ScheduleSheet.create({api, sheetId, name: config.scheduleName}),
                    TasksSheet.create({api, sheetId, name: config.tasksName}),
                    ContactsSheet.create({api, sheetId, name: config.contactSheetName})
                ]);
            })
            .then((result) => {
                return new TaskSchedule(
                    config,
                    <ScheduleSheet> result[0],
                    <TasksSheet>    result[1],
                    <ContactsSheet> result[2]
                );
            });
    }

    private constructor(
        private config: ITaskScheduleConfig,
        private schedule: ScheduleSheet,
        private tasks: TasksSheet,
        private contacts: ContactsSheet
    ) {}

    public getCurrentReminders(): {[phone: string]: string|string[]} {
        let contacts = this.contacts.getContacts();

        let now = moment.tz(config.get<string>('timezone')).toDate();
        let lastHour = moment(now).subtract(1, 'hour').toDate();
        let pastDueReminderHour = config.get<number>('pastDueReminderHour');
        let pastDueReminder = moment.tz(config.get<string>('timezone')).hour(pastDueReminderHour).toDate();

        let currentReminders = {};

        // A merge function that combines colliding values into a list if multiple values exist for a property:
        let mergeArrays = function (objVal, srcVal) {
            if (!objVal) return srcVal;
            if (!_.isArray(objVal)) return [objVal, srcVal];
            return objVal.concat(srcVal);
        };

        console.log(pastDueReminder.getHours(), now.getHours());

        if (pastDueReminder.getHours() === now.getHours()) {
            let pastDue = this.schedule.getAssignments({
                pastDue: true,
                complete: false
            });
            let pastDueReminders = TaskSchedule.formatPastDueReminders(pastDue, contacts, this.config.tinyUrl);
            currentReminders = _.mergeWith(currentReminders, pastDueReminders, mergeArrays);
        }

        let upcoming = this.schedule.getAssignments({
            pastDue: false,
            complete: false
        }).filter((a: TaskAssignment) => {
            let task = this.tasks.getTask(a.task);
            let reminderTime = moment(a.due).subtract(task.reminderTime, 'hours').toDate();
            return lastHour < reminderTime && reminderTime < now;
        });
        if (upcoming.length) {
            let upcomingReminders = TaskSchedule.formatUpcomingReminders(upcoming, contacts, this.config.tinyUrl);
            currentReminders = _.mergeWith(currentReminders, upcomingReminders, mergeArrays);
        }

        //console.log(currentReminders);

        return currentReminders;
    }

    public static formatPastDueReminders(
        pastDueAssignments: TaskAssignment[],
        contacts: { [value: string]: Contact },
        tinyUrl: string
    ): {[phone: string]: string} {
        let now = moment.tz(config.get<string>('timezone')).toDate();
        let assignments = TaskSchedule.indexByPerson(pastDueAssignments);
        let messages = _.transform(assignments, (result, tasks, person) => {
            let phone = contacts[person].phone;
            let attempt = '';
            let included = [];
            let excluded = tasks.slice(0).sort((a: TaskAssignment, b: TaskAssignment) => {
                if (a.due < b.due) return -1;
                if (a.due > b.due) return 1;
                return 0;
            });
            result[phone] = '';

            // Add one more item until we either include all items or hit the 160 cap.
            while (attempt.length < 160 && excluded.length) {
                result[phone] = attempt;
                included.push(excluded.pop());
                attempt = TaskSchedule.pastDueMessage(person, included, excluded, tinyUrl, now);
            }
            if (attempt.length < 160) {
                result[phone] = attempt;
            }
        }, {});
        return <{ [phone: string]: string; }> messages;
    }

    public static formatUpcomingReminders(
        upcomingAssignments: TaskAssignment[],
        contacts: { [value: string]: Contact },
        tinyUrl: string
    ):  {[phone: string]: string} {
        let assignments = TaskSchedule.indexByPerson(upcomingAssignments);
        let messages = _.transform(assignments, (result, tasks, person) => {
            let phone = contacts[person].phone;
            let attempt = '';
            let included = [];
            let excluded = null;
            if (tasks.length === 1) {
                let task = <TaskAssignment> tasks[0];
                excluded = _.shuffle(task.people.slice(0));
                result[phone] = '';

                // Add one more item until we either include all items or hit the 160 cap.
                if (excluded.length) {
                    while (attempt.length < 160 && excluded.length) {
                        result[phone] = attempt;
                        included.push(excluded.pop());
                        attempt = TaskSchedule.upcomingReminderMessageSingleTask(person, task, included, !!excluded.length, contacts, tinyUrl);
                    }
                    if (attempt.length < 160) {
                        result[phone] = attempt;
                    }
                } else {
                    result[phone] = TaskSchedule.upcomingReminderMessageSingleTask(person, task, included, false, contacts, tinyUrl);
                }
            } else {
                excluded = tasks.slice(0).sort((a: TaskAssignment, b: TaskAssignment) => {
                    if (a.due < b.due) return 1;
                    if (a.due > b.due) return -1;
                    return 0;
                });
                result[phone] = '';

                // Add one more item until we either include all items or hit the 160 cap.
                while (attempt.length < 160 && excluded.length) {
                    result[phone] = attempt;
                    included.push(excluded.pop());
                    attempt = TaskSchedule.upcomingReminderMessageMultiTask(person, included, excluded, contacts, tinyUrl);
                }
                if (attempt.length < 160) {
                    result[phone] = attempt;
                }
            }
        }, {});
        return <{ [phone: string]: string; }> messages;
    }

    private static pastDueMessage(
        person: string,
        tasks: TaskAssignment[],
        excluded: TaskAssignment[],
        tinyUrl: string,
        now: Date) {

        return [
            `Hi, ${person}!`,
            `You have some overdue house items!`,
            ...TaskSchedule.pastDueList(tasks, excluded, now),
            `${tinyUrl}`,
            `Thanks!`
        ].join('\n')
    }

    private static upcomingReminderMessageSingleTask(
        person: string,
        task: TaskAssignment,
        people: string[],
        excluded: boolean,
        contacts: { [value: string]: Contact },
        tinyUrl: string
    ) {
        let dueIn = moment(task.due).calendar().replace(' at 11:59 PM', '').toLowerCase();
        return [
            `Hi, ${person}!`,
            `Reminder: ${task.task} is scheduled for ${dueIn}.`,
            ...TaskSchedule.partners(people, excluded),
            ...TaskSchedule.points(person, contacts),
            `${tinyUrl}`,
            `Thanks!`
        ].join('\n');
    }

    private static upcomingReminderMessageMultiTask(
        person: string,
        tasks: TaskAssignment[],
        excluded: TaskAssignment[],
        contacts: { [value: string]: Contact },
        tinyUrl: string) {

        return [
            `Hi, ${person}!`,
            `Reminder, you have ${tasks.length} upcoming tasks: `,
            ...TaskSchedule.upcomingList(tasks, excluded),
            ...TaskSchedule.points(person, contacts),
            `${tinyUrl}`,
            `Thanks!`
        ].join('\n')
    }

    private static pastDueList(tasks: TaskAssignment[], excluded: TaskAssignment[], now: Date): string[] {
        let list = tasks.map((task: TaskAssignment, i) => {
            let dueAgo = moment.duration(now.getTime() - task.due.getTime()).humanize();
            return ` ${i+1}. ${task.task}, ${dueAgo} ago`;
        });
        if (excluded.length) {
            list = list.concat([
                ` ${tasks.length+1}. ... ${excluded.length} more`
            ]);
        }
        return list;
    }

    private static points(person, contactsByName: { [value: string]: Contact }): string[] {
        let contacts = _.values(contactsByName).sort((a: Contact, b: Contact) => {
            let aPoints = a.points || 0;
            let bPoints = b.points || 0;
            if (aPoints > bPoints) return -1;
            if (aPoints < bPoints) return 1;
            return 0;
        });
        let highestPointValue = contacts[0].points || 0;
        let winners = contacts.filter((contact: Contact) => contact.points === highestPointValue);
        let me = contactsByName[person];
        let line = `You have ${me.points} points.`;
        if (winners.indexOf(me) !== -1 && highestPointValue !== 0) {
            line += ' (And are winning)';
        }
        return [line];
    }

    private static partners(people: string[], excluded: boolean): string[] {
        let lines = [], line;
        if (people.length) {
            if (people.length === 1) {
                line = `Your partner in crime is ${people[0]}`;
            } else {
                line = `Your partners in crime are ${people.join(', ')}`;
            }
            if (excluded) {
                line += ', ...';
            } else {
                line += '.';
            }
            lines.push(line);
        }
        return lines;
    }

    private static upcomingList(tasks: TaskAssignment[], excluded: TaskAssignment[]): string[] {
        let list = tasks.map((task: TaskAssignment, i) => {
            let dueIn = moment(task.due).calendar().replace(' at 11:59 PM', '').toLowerCase();
            return ` ${i+1}. ${task.task}, ${dueIn}`;
        });
        if (excluded.length) {
            list = list.concat([
                ` ${tasks.length+1}. ... ${excluded.length} more`
            ]);
        }
        return list;
    }

    private static indexByPerson(assignments: TaskAssignment[]): {[person: string]: TaskAssignment[]} {
        var byPerson: {[person: string]: TaskAssignment[]} = {};
        _.each(assignments, (a: TaskAssignment) => {
            _.each(a.people, person => {
                // Deep copy:
                let aNew = Object.assign({}, a);
                aNew.people = aNew.people.slice();

                aNew.people = _.without(aNew.people, person);

                if (!byPerson[person]) {
                    byPerson[person] = [];
                }

                byPerson[person].push(aNew);
            });
        });
        return byPerson;
    }
}