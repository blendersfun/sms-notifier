
var sendRemindersIfItIsTime = require('./quickstart-google-sheets');
var howOftenToWake = 1000 * 60 * 60; // An hour in ms.

function wake() {
    sendRemindersIfItIsTime();
    setTimeout(wake, howOftenToWake);
}

wake();
