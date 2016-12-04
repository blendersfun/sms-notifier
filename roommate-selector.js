
var _ = require('lodash');

var roommates = ['Aaron',
                 'Ian',
                 'Jeff',
                 'Jim',
                 'Megan',
                 'Nathan',
                 'Johnny',
                 'Scott'];

var up_bath_roommates = ['Aaron',
                         'Ian',
                         'Megan',
                         'Scott'];

var down_hall_bath_roommates = ['Jeff',
                                'Jim'];

var down_small_bath_roommates = ['Nathan',
                                 'Johnny'];

var up_kitchen_roommates = ['Aaron',
                            'Ian',
                            'Jeff',
                            'Megan',
                            'Scott',
                            'Johnny'];

var down_kitchen_roommates = ['Jim',
                              'Nathan',
                              'Charlie']; // Charlie volunteered to participate 
                                          // in down kitchen portion, even though 
                                          // he is only a workspace-level roommate. 
                                          // Very generous!

console.log('               All:', _.shuffle(roommates).join(', '));
console.log('           Up bath:', _.shuffle(up_bath_roommates).join(', '));
console.log('    Down Hall bath:', _.shuffle(down_hall_bath_roommates).join(', '));
console.log('   Down Small bath:', _.shuffle(down_small_bath_roommates).join(', '));
console.log('  Up Kitchen users:', _.shuffle(up_kitchen_roommates).join(', '));
console.log('Down Kitchen users:', _.shuffle(down_kitchen_roommates).join(', '));