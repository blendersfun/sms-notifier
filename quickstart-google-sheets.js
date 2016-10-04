var fs = require('fs');
var readline = require('readline');
var google = require('googleapis');
var googleAuth = require('google-auth-library');
var _ = require('lodash');
var moment = require('moment');

var secrets = '';
try {
    secrets = JSON.parse(fs.readFileSync('./secrets.json'));
} catch (e) {
    console.log('Could not parse the secrets.json file. Cannot proceed.');
    process.exit();
}


// Twillio Stuff:

var FAKE = true;

// Real:
var accountSid = secrets.twilioAccountSid;
var authToken = secrets.twilioAuthToken;

var twilio = require('twilio');
var client = new twilio.RestClient(accountSid, authToken);

function sendText(who, message, contacts) {
    var contact = _.find(contacts, row => row[0] === who);
    var phoneNumber = '+1' + contact[1].replace(/[^\d]/g, '');
    if (FAKE) {
        console.log(phoneNumber, message);
        console.log('---');
    } else {
        client.messages.create({
            body: message,
            from: '+15036943429', // From a valid Twilio number
            to: phoneNumber  // Text this number
        }, function(err, message) {
            console.log(err, message && message.sid);
        });
    }
}



// If modifying these scopes, delete your previously saved credentials
// at ~/.credentials/sheets.googleapis.com-nodejs-quickstart.json
var SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];
var TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH ||
    process.env.USERPROFILE) + '/.credentials/';
var TOKEN_PATH = TOKEN_DIR + 'sheets.googleapis.com-nodejs-quickstart.json';

// Load client secrets from a local file.

function sendRemindersIfItIsTime() {
    fs.readFile('client_secret.json', function processClientSecrets(err, content) {
        if (err) {
            console.log('Error loading client secret file: ' + err);
            return;
        }
        // Authorize a client with the loaded credentials, then call the
        // Google Sheets API.
        authorize(JSON.parse(content), doSpreadsheetStuff);
    });
}

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 *
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
    var clientSecret = credentials.installed.client_secret;
    var clientId = credentials.installed.client_id;
    var redirectUrl = credentials.installed.redirect_uris[0];
    var auth = new googleAuth();
    var oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);

    // Check if we have previously stored a token.
    fs.readFile(TOKEN_PATH, function (err, token) {
        if (err) {
            getNewToken(oauth2Client, callback);
        } else {
            oauth2Client.credentials = JSON.parse(token);
            callback(oauth2Client);
        }
    });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 *
 * @param {google.auth.OAuth2} oauth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback to call with the authorized
 *     client.
 */
function getNewToken(oauth2Client, callback) {
    var authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES
    });
    console.log('Authorize this app by visiting this url: ', authUrl);
    var rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    rl.question('Enter the code from that page here: ', function (code) {
        rl.close();
        oauth2Client.getToken(code, function (err, token) {
            if (err) {
                console.log('Error while trying to retrieve access token', err);
                return;
            }
            oauth2Client.credentials = token;
            storeToken(token);
            callback(oauth2Client);
        });
    });
}

/**
 * Store token to disk be used in later program executions.
 *
 * @param {Object} token The token to store to disk.
 */
function storeToken(token) {
    try {
        fs.mkdirSync(TOKEN_DIR);
    } catch (err) {
        if (err.code != 'EEXIST') {
            throw err;
        }
    }
    fs.writeFile(TOKEN_PATH, JSON.stringify(token));
    console.log('Token stored to ' + TOKEN_PATH);
}

var authObj = null;
var spreadsheetId = '1KuSSE1gyCGmstAp_yrQzDiFiv_uCvruOmlPcqPBsceg';

function getSheetRange (range) {
    return new Promise((resolve, reject) => {
        var sheets = google.sheets('v4');
        sheets.spreadsheets.values.get({
            auth: authObj,
            spreadsheetId: spreadsheetId,
            range: range
        }, function (err, response) {
            if (err) {
                console.log('The API returned an error: ' + err);
                reject(err);
            }
            var rows = response.values;
            resolve(rows);
        });
    });
}

function doSpreadsheetStuff(auth) {
    authObj = auth;

    Promise.all([
            getSheetRange('Maintenance Schedule!B1:F'),
            getSheetRange('Task Types!A1:G'),
            getSheetRange('Contacts!A2:B')
        ])
        .then(results => {
            var schedule = results[0], tasks = results[1], contacts = results[2], now = moment();

            // Helper methods:

            var printAssignment = function (assignment) {
                return [
                    assignment.who,
                    assignment.what,
                    assignment.when.format('MM/DD/YY'),
                    assignment.duration
                ];
            };

            // Compute the durations in minutes of each task type:

            var task_name_row =     tasks[0].indexOf('Task Title'),
                time_estimate_row = tasks[0].indexOf('Time Required Estimate'),
                reminder_row      = tasks[0].indexOf('Reminder Time'),
                tasks_by_name = _.chain(tasks.slice(1))
                    .map(row => {
                        var splits = row[time_estimate_row].split(/\s+/g),
                            amount = splits[0].length ? parseFloat(splits[0]) : 0,
                            increment = splits[1].length ? splits[1] : 'minutes';
                        var task_aliases = row[task_name_row].split(/\s*,\s*/g);

                        return _.map(task_aliases, task_alias => [
                            task_alias,
                            moment.duration(amount, increment).asMinutes(),
                            row[reminder_row]
                        ]);
                    })
                    .flatten()
                    .keyBy(row => row[0])
                    .mapValues(row => ({
                        name: row[0],
                        estimate: row[1],
                        reminder: row[2]
                    }))
                    .value();

            // Compute per-roommate, what tasks are assigned to them:

            var what_row = schedule[0].indexOf('Task'),
                when_row = schedule[0].indexOf('Due'),
                who_row  = schedule[0].indexOf('Who'),
                done_row  = schedule[0].indexOf('Is Completed'),
                roommates_assignments = _.chain(schedule.slice(1))
                    .map(row => {
                        var allWho = row[who_row].split(/\s*,\s*/g),
                            what = row[what_row],
                            when = row[when_row],
                            isDone = row[done_row];
                        return _.map(allWho, who => ({who, what, when, isDone, whoElse: _.without(allWho, who)}));
                    })
                    .flatten()
                    .sort()
                    .forEach(row => {
                        // Set it to be only past due at the latest possible time on the assigned day:
                        row.when = moment(row.when, 'MM/DD/YYYY');
                        row.when.hour(23);
                        row.when.minute(59);
                        row.when.second(59);

                        row.duration = tasks_by_name[row.what] ? tasks_by_name[row.what].estimate : -1;
                    })
                    .filter(row => row.when.year() === now.year())
                    .filter(row => !row.isDone)
                    .value();

            // Sum the estimated work time in minutes per roommate this year:

            var roommate_loads = {};

            _.forEach(roommates_assignments, assignment => {
                roommate_loads[assignment.who] = (roommate_loads[assignment.who] || 0) + assignment.duration;
            });
            _.forEach(roommate_loads, (a, b) => {
                roommate_loads[b] = moment.duration(a, 'minutes').humanize();
            });

            // Compute past-due tasks per-roommate:
            var past_due = {};
            var time_to_remind = {};

            // Returns true if the reminder time on the correct day has past in the past hour.
            function isReminderTime(assignment) {
                var reminderOffsets = {
                    "Day Of": 0,
                    "Day Before": 1
                };

                var task = tasks_by_name[assignment.what];
                var reminderHourInDay = _.chain(task.reminder)
                    .thru(rawStr => rawStr.match(/(\d+)([ap]m)/))
                    .thru(match => match ? [parseInt(match[1]), match[2]] : [12, 'pm'])
                    .thru(pair => {
                        if (pair[0] === 12 && pair[1] === 'am') return 0;
                        if (pair[1] === 'pm') return pair[0] + 12;
                        return pair[0];
                    })
                    .value();
                var dayOffsetFromDueDate = _.chain(reminderOffsets)
                    .thru(Object.keys)
                    .filter(offsetName => task.reminder.indexOf(offsetName) !== -1)
                    .thru(offsetInArray => reminderOffsets[offsetInArray[0]] || 0)
                    .value();
                var reminder = moment(assignment.when)
                    .subtract(dayOffsetFromDueDate, 'days')
                    .hour(reminderHourInDay)
                    .minute(0)
                    .second(0);

                return Math.abs(moment.duration(reminder - now)) < moment.duration(30, 'minutes');
            }

            _.forEach(roommates_assignments, assignment => {
                if (assignment.when <= now) {
                    past_due[assignment.who] = (past_due[assignment.who] || []).concat([assignment]);
                } else if (isReminderTime(assignment)) {
                    time_to_remind[assignment.who] = (time_to_remind[assignment.who] || []).concat([assignment]);
                }
            });

            var urlToTaskSheet = 'http://tiny.cc/zl49ey';
            var past_due_reminder = 12; // military type for daily reminder (noon)
            var sms_length_cap = 160;

            _.forEach(past_due, assignments => {
                var formattedAssignments = [];
                var smsMessage = '', possibleSmsMessage = '';
                assignments.sort((a, b) => {
                    a = now - a.when;
                    b = now - b.when;
                    return a - b;
                });
                _.forEach(assignments, (a, i) => {
                    var dueAgo = moment.duration(now - a.when).humanize();
                    formattedAssignments.push(` ${i + 1}. ${a.what}, ${dueAgo} ago`);

                    possibleSmsMessage = `Hi, ${assignments[0].who}!\n`+
                        `You have some overdue house items!\n`+
                        `${formattedAssignments.join('\n')}\n`+
                        (formattedAssignments.length < assignments.length ?
                            ` ${formattedAssignments.length + 1}. ... (${assignments.length - formattedAssignments.length} more)\n` :
                            ''
                        ) +
                        `${urlToTaskSheet}\n`+
                        `Thanks!`;
                    smsMessage = possibleSmsMessage.length <= 160 ? possibleSmsMessage : smsMessage;
                });

                if (now.hour() > past_due_reminder && now.hour() < past_due_reminder + 1) {
                    sendText(assignments[0].who, smsMessage, contacts);
                }
            });

            _.forEach(time_to_remind, assignments => {
                var formattedAssignments = [];
                var smsMessage = '', possibleSmsMessage = '';
                assignments.sort((a, b) => {
                    a = now - a.when;
                    b = now - b.when;
                    return a - b;
                });
                var a = assignments[0];
                var mt1 = a.whoElse.length > 1; // "more than 1"

                if (assignments.length === 1) {
                    var whoElseList = '';

                    if (a.whoElse.length) {
                        var whoElseMixed = _.shuffle(a.whoElse);
                        whoElseList = whoElseMixed[0];
                        for (var i = 1; i < whoElseMixed.length; i++) {
                            if (i === whoElseMixed.length) {

                            } else if (i === whoElseMixed.length - 1) {
                                whoElseList += ' and ' + whoElseMixed[i];
                            } else {
                                whoElseList += ', ' + whoElseMixed[i];
                            }
                        }
                    }

                    var formattedWhoElse = a.whoElse.length ?
                        `Your partner${mt1? 's':''} in crime ${mt1? 'are':'is'} ${whoElseList}.\n` :
                        '';

                    smsMessage = `Hi, ${a.who}!\n`+
                        `Reminder: "${a.what}" is scheduled for ${a.when.calendar().replace(' at 11:59 PM', '').toLowerCase()}.\n`+
                        formattedWhoElse +
                        `Thanks!`;
                } else {
                    _.forEach(assignments, (a, i) => {
                        formattedAssignments.push(` ${i + 1}. "${a.what}" is scheduled ${assignments[0].when.calendar().replace(' at 11:59 PM', '').toLowerCase()}`);

                        possibleSmsMessage = `Hi, ${assignments[0].who}!\n`+
                            `Reminder: \n`+
                            `${formattedAssignments.join('\n')}\n`+
                            (formattedAssignments.length < assignments.length ?
                                    ` ${formattedAssignments.length + 1}. ... (${assignments.length - formattedAssignments.length} more)\n` :
                                    ''
                            ) +
                            `${urlToTaskSheet}\n`+
                            `Thanks!`;
                        smsMessage = possibleSmsMessage.length <= 160 ? possibleSmsMessage : smsMessage;
                    });
                }

                sendText(assignments[0].who, smsMessage, contacts);
            });


            //console.log(tasks_by_name);

            // Here are the printouts so far:

            //console.log('\n Past Due:');
            //_.forEach(past_due, (assignments) => {
            //    console.log(assignments.map(printAssignment));
            //});
            //
            //console.log('\n Assignments:');
            //console.log(roommates_assignments.map(printAssignment));
            //
            //console.log('\n Hours per Roomate so far This Year:');
            //console.log(roommate_loads);

        })
        .catch(error => {
            console.log('An error was encountered: ', error);
        });
}

module.exports = sendRemindersIfItIsTime;
