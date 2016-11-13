# sms-notifier

## Description

An sms-based reminder tool that wakes every hour, checks a google spreadsheet for
task assignments and sends out sms reminder notices when tasks are upcoming or past due.

## Development Plans

Typescript Refactor
 - auto fill in estimated totals, last five assigned
 - auto fill estimated times if missing on schedule
 - compute past due, incomplete tasks and format reminder sms messages under 160 chars
 - compute reminder times for upcoming, incomplete tasks
 - format reminder messages for upcoming, incomplete tasks under 160 chars
 - wake every hour on the hour as a matter of course
 - prototype webhook for reading sms messages back in
 - implement sms replies for checking of most recently reminded or past due incomplete item
 - implement brownie point system for doing tasks before past due reminder goes out
