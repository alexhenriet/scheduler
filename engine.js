#!/usr/bin/env node
/*jslint node: true */
"use strict";

require('./augmented_types');

var output = require('./output'), json_reader = require('./json_reader'),
  orchestrator = require('./orchestrator'), executor = require('./executor');

try {
  var parameters = json_reader.load('config/parameters.json'),
    config = json_reader.load('config/config.json');
} catch (error) {
  console.log(error);
  process.exit(1);
}

output.setLogFile(parameters.logFile);
executor.setOutput(output);
executor.setParameters(parameters);

// script shutdowns itself at 00.00 to be relaunched by forever
var planning = orchestrator.getTodayPlanning(config);
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
    executor.executeTimestampJobs(planning[timestamp]);
  }
}, 1000);

/*
// Triggering manually the execution for DEV purpose. 
// Function executor.executeTimestampJobs() will be called by setInterval().
var jobs = [];
jobs.push({ name:'CPUINFO Snapshot', env:'dev', config:config[0].environments['dev'] });
jobs.push({ name:'CPUINFO Snapshot', env:'tst', config:config[0].environments['tst'] });
executor.executeTimestampJobs(jobs);
*/
