require('./augmented_types');

var fs = require('fs'), Log = require('log'), logFile;

exports.setLogFile = function (file) {
  logFile = file;
}

exports.send = function (message) {
  if (! logFile) {
    throw ('Out error: logFile must be set before put() can be used');
  }
  var log = new Log(
    'debug',
    fs.createWriteStream(logFile, { flags: 'a', encoding: 'utf8' })
  ), timestamp = (new Date()).niceFormat();
  console.log('[' + timestamp + '] ' + message);
  log.info(message);
}
