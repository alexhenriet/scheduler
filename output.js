require('./augmented_types');

var fs = require('fs'), 
  Log = require('log'),
  logFile;
  
module.exports = {};

module.exports.setLogFile = function (file) {
  logFile = file;
}

module.exports.send = function (message) {
  if (! logFile) {
    throw ('Output error: logFile must be set before put() can be used');
  }
  var log = new Log(
    'debug',
    fs.createWriteStream(logFile, { flags: 'a', encoding: 'utf8' })
  ), timestamp = (new Date()).niceFormat();
  console.log('[' + timestamp + '] ' + message);
  log.info(message);
}
