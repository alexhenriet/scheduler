var child_process = require('child_process');

var output, parameters;

exports.setOutput = function (o) {
  output = o;
}

exports.setParameters = function(p) {
  parameters = p;
}

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

exports.executeTimestampJobs = function (jobs) {
  var i, jLength = jobs.length;
  for (i = 0; i < jLength; i++) {
    executeJob(jobs[i]);
  }
}
