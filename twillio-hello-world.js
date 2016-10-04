// Real:
var accountSid = 'AC88d4c751a3e6c28ceafb141d5520995f'; // Your Account SID from www.twilio.com/console
var authToken = 'b656727e48b0efbe44e37b7b03550fc2';   // TODO: REMOVE SENSITIVE CONFIGS FROM SOURCE CODE BEFORE COMMITTING TO GIT!!!!!var accountSid = 'AC88d4c751a3e6c28ceafb141d5520995f'; // Your Account SID from www.twilio.com/console

// Test:
// var accountSid = 'AC4f9fb843bdf3d9aa0485bd97b8d78e64'; // Your Account SID from www.twilio.com/console
// var authToken = '21ab8d6751be03c8c2ba504dc988e835';   // TODO: REMOVE SENSITIVE CONFIGS FROM SOURCE CODE BEFORE COMMITTING TO GIT!!!!!

var twilio = require('twilio');
var client = new twilio.RestClient(accountSid, authToken);

client.messages.create({
    body: 'Reminder: "Trash" is due today. It is assigned to you and Nathan.',
    from: '+15036943429', // From a valid Twilio number
    //from: '+15005550006', // From the Twilio test number
    //to: '+12067478363',  // (kate)
    //to: '+15417408981'  // (nathan v)
    //to: '+15037993970'  // Text this number
    to: '+15034533916'  // Text this number
}, function(err, message) {
    console.log(err, message && message.sid);
});
