var fs = require('fs');

exports.load = function (file) {
  try {
    var jsonData = fs.readFileSync(file, { encoding: "utf8" });
    return JSON.parse(jsonData);
  } catch (error) {
    throw ('json_reader encountered an error with file "' + file + '" error : ' + error);
  }
};
