#!/usr/bin/env node
/*jslint node: true */
"use strict";

require('./augmented_types');

var child_process = require('child_process'),
  output = require('./output'),
  json_reader = require('./json_reader'),
  orchestrator = require('./orchestrator');

var parameters = json_reader.load('config/parameters.json'),
    config = json_reader.load('config/config.json');

output.setLogFile(parameters.logFile);

// script shutdowns itself at 00.00 to be relaunched by forever
var planning = orchestrator.getTodayPlanning(config);

function getSshCommand(command, server) {
  return parameters.sshBinary + ' ' + server.host + ' -l ' + server.user +
    ' -i ' + parameters.sshPrivateKey + ' "' + command + '"';
}

function sendEmail(email, message) {
  // TODO: Implement function
  output.send('Sending EMAIL to ' + email);
}

function executeJob(job) {
  var server = job.config.servers[0], altServer;
  output.send('Triggering JOB "' + job.name + ' (' + job.env + ')" on server ' + server.host);
  child_process.exec(getSshCommand(job.config.command, server), function (error, stdout, stderr) {
    if (error) {
      var errorMessage = 'JOB "' + job.name + ' (' + job.env + ')" on server ' +
        server.host + ' failed with exit code ' + error.code + '\n' +
        'STDOUT:\n' + stdout + '\n' + 'STDERR:\n' + stderr;
      output.send(errorMessage);
      sendEmail(job.config.email, errorMessage);
      if (job.config.servers[1]) { // Run task on fallback server if exists
        altServer = job.config.servers[1];
        output.send(
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
              output.send(altErrorMessage);
              sendEmail(job.config.email, altErrorMessage);
            } else {
              output.send(
                'JOB "' + job.name + ' (' + job.env + ')" ' +
                  ' on server ' + altServer.host + ' completed successfully'
              );
            }
          }
        );
      }
    } else {
      output.send(
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
output.send('Script will automatically shutdown at [' + shutdownTimestamp + ']');

setInterval(function () {
  var timestamp = (new Date()).niceFormat();
  if (timestamp === shutdownTimestamp) {
    output.send('Scheduled shutdown of the script');
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
