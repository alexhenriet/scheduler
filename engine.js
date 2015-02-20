#!/usr/bin/env node
/*jslint node: true */
"use strict";

var parameters = {
  configFile: 'config.json',
  logFile: 'engine.log',
  sshBinary: '/usr/bin/ssh'
};

var parser = require('cron-parser'),
  child_process = require('child_process'),
  fs = require('fs'),
  Log = require('log');

Date.prototype.niceFormat = function () {
  function pad2(n) {
    return (n < 10 ? '0' : '') + n;
  }
  return this.getFullYear() + '-' +
    pad2(this.getMonth() + 1) + '-' +
    pad2(this.getDate()) + ' ' +
    pad2(this.getHours()) + ':' +
    pad2(this.getMinutes()) + ':' +
    pad2(this.getSeconds());
};

function output(message) {
  var log = new Log(
    'debug',
    fs.createWriteStream(parameters.logFile, { flags: 'a', encoding: 'utf8' })
  ), timestamp = (new Date()).niceFormat();
  console.log('[' + timestamp + '] ' + message);
  log.info(message);
}

try {
  var jsonData = fs.readFileSync(parameters.configFile, { encoding: "utf8" });
} catch (error) {
  output(error);
  process.exit(1);
}

try {
  var config = JSON.parse(jsonData);
} catch (error) {
  output(error);
  process.exit(1);
}

// planning for today (script shutdowns itself at 00.00 to be relaunched by forever
var planning = {};

/* 
planning format :
---------------
{ 'Wed Feb 18 2015 13:12:00 GMT+0100 (CET)': 
   [ { command: '/usr/bin/env php /opt/…',
       schedule: '* * * * *',
       servers: [Object],
       email: 'john.doe@foo.bar' },
     { command: '/usr/bin/env php /opt/…',
       schedule: '* * * * *',
       servers: [Object],
       email: 'john.doe@foo.bar' } ],
  'Wed Feb 18 2015 13:13:00 GMT+0100 (CET)': 
*/

var i, env, cLength = config.length;
for (i = 0; i < cLength; i++) {
  for (env in config[i].environments) {
    if (config[i].environments.hasOwnProperty(env)) {
      var schedule = config[i].environments[env].schedule;
      var interval = parser.parseExpression(
        schedule,
        { currentDate: new Date(), endDate: (new Date()).setHours(23, 59, 59) }
      );
      while (true) {
        try {
          var timestamp = interval.next().niceFormat();
          if (!planning.hasOwnProperty(timestamp)) {
            planning[timestamp] = [];
          }
          // { name:'CPUINFO Snapshot', env:'dev', config:config[0].environments['dev'] }
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

function getSshCommand(command, server) {
  return parameters.sshBinary + ' ' + server.host + ' -l ' + server.user + ' "' + command + '"';
}

function sendEmail(email, message) {
  // TODO: Implement function
  output('Sending EMAIL to ' + email);
}

function executeJob(job) {
  var server = job.config.servers[0], altServer;
  output('Triggering JOB "' + job.name + ' (' + job.env + ')" on server ' + server.host);
  child_process.exec(getSshCommand(job.config.command, server), function (error, stdout, stderr) {
    if (error) {
      var errorMessage = 'JOB "' + job.name + ' (' + job.env + ')" on server ' +
        server.host + ' failed with exit code ' + error.code + '\n' +
        'STDOUT:\n' + stdout + '\n' + 'STDERR:\n' + stderr;
      output(errorMessage);
      sendEmail(job.config.email, errorMessage);
      if (job.config.servers[1]) { // Run task on fallback server if exists
        altServer = job.config.servers[1];
        output(
          'Triggering JOB "' + job.name + ' (' + job.env + ')" ' +
            'on alternative server ' + altServer.host
        );
        child_process.exec(
          getSshCommand(job.config.command, altServer),
          function (altError, altStdout, altStderr) {
            if (altError) {
              var altErrorMessage = 'JOB "' + job.name + ' (' + job.env + ')" on server ' +
                altServer.host + ' failed with exit code ' + altError.code + '\n' +
                'STDOUT:\n' + altStdout + '\n' + 'STDERR:\n' + altStderr;
              output(altErrorMessage);
              sendEmail(job.config.email, altErrorMessage);
            } else {
              output(
                'JOB "' + job.name + ' (' + job.env + ')" ' +
                  ' on server ' + altServer.host + ' completed successfully'
              );
            }
          }
        );
      }
    } else {
      output(
        'JOB "' + job.name + ' (' + job.env + ')" ' +
          'on server ' + server.host + ' completed successfully'
      );
    }
  });
}

function executeTimestampJobs(jobs) {
  var i, jLength = jobs.length;
  for (i = 0; i < jLength; i++) {
    executeJob(jobs[i]);
  }
}

var today = new Date();
var tomorrow = new Date(today);
tomorrow.setDate(today.getDate() + 1);
tomorrow.setHours(0, 0, 0);
var shutdownTimestamp = tomorrow.niceFormat();
output('Script will automatically shutdown at [' + shutdownTimestamp + ']');

setInterval(function () {
  var timestamp = (new Date()).niceFormat();
  if (timestamp === shutdownTimestamp) {
    output('Scheduled shutdown of the script');
    process.exit(0);
  }
  if (planning.hasOwnProperty(timestamp)) {
    executeTimestampJobs(planning[timestamp]);
  }
}, 1000);

/*
// Triggering manually the execution for DEV purpose. 
// Function executeTimestampJobs() will be called by setInterval().
var jobs = [];
jobs.push({ name:'CPUINFO Snapshot', env:'dev', config:config[0].environments['dev'] });
jobs.push({ name:'CPUINFO Snapshot', env:'tst', config:config[0].environments['tst'] });
executeTimestampJobs(jobs);
*/
