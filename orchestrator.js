
require('./augmented_types');

var parser = require('cron-parser');

module.exports = {};

/* 
planning format :
---------------
{ '2015-02-20 11:14:00': 
   [ { name: 'CPUINFO Snapshot job', env: 'dev', config: [Object] },
     { name: 'CPUINFO Snapshot job', env: 'tst', config: [Object] } ],
  '2015-02-20 11:15:00': 
   [ { name: 'CPUINFO Snapshot job', env: 'dev', config: [Object] },
     { name: 'CPUINFO Snapshot job', env: 'tst', config: [Object] } ],
  '2015-02-20 11:16:00': 
   [ { name: 'CPUINFO Snapshot job', env: 'dev', config: [Object] },
     { name: 'CPUINFO Snapshot job', env: 'tst', config: [Object] } ],
  ...
  '2015-02-20 23:59:00': 
   [ { name: 'CPUINFO Snapshot job', env: 'dev', config: [Object] },
     { name: 'CPUINFO Snapshot job', env: 'tst', config: [Object] } ] }

*/

module.exports.getTodayPlanning = function (config) {
  var planning = {}, i, env, cLength = config.length, schedule, interval, timestamp;
  for (i = 0; i < cLength; i++) {
    for (env in config[i].environments) {
      if (config[i].environments.hasOwnProperty(env)) {
        schedule = config[i].environments[env].schedule;
        interval = parser.parseExpression(
          schedule,
          { currentDate: new Date(), endDate: (new Date()).setHours(23, 59, 59) }
        );
        while (true) {
          try {
            timestamp = interval.next().niceFormat();
            if (!planning.hasOwnProperty(timestamp)) {
              planning[timestamp] = [];
            }
            planning[timestamp].push(
              { name: config[i].name, env: env, config: config[i].environments[env] }
            );
          } catch (error) {
            break;
          }
        }
      }
    }
  }
  return planning;
}

