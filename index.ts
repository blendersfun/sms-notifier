
import * as config from 'config';
import { Notifier } from './notifier';

Notifier.create(
        config.get<string>('greatHouseMaintenance.googleSheetId'),
        config.get<string>('greatHouseMaintenance.scheduleName'),
        config.get<string>('greatHouseMaintenance.tasksName'),
        config.get<string>('greatHouseMaintenance.contactSheetName')
    )
    .then(notifier => notifier.start())
    .catch(err => {
        console.log('Notifier:greatHouseMaintenance - global error handler: ', err.stack);
    });