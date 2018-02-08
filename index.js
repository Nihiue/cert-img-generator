var express = require('express');
var formidable = require('formidable')
var fs = require('fs');
var app = express();
var path = require('path');
const PORT = 8000;


app.post('/api/savefile', function (req, res) {
  var form = new formidable.IncomingForm();
  form.uploadDir = "./upload";
  form.parse(req, function (err, fields, files) {
    const folderName = fields['folderName'];
    const fileName = fields['fileName'];
    try {
      if (!folderName || !fileName || !files.uploadFile) {
        console.log(folderName, fileName, files.uploadFile);
        throw new Error('输入不完整');
      }
      const folderPath = path.join('./upload', folderName);
      try {
        fs.accessSync(folderPath)
      } catch (e) {
        fs.mkdirSync(folderPath);
      }
      fs.renameSync(files.uploadFile.path, path.join(folderPath, fileName));
      res.writeHead(200, {
        'content-type': 'text/plain;charset=utf-8'
      });
      res.end('OK');
    } catch (e) {
      console.log(e);
      res.writeHead(400, {
        'content-type': 'text/plain;charset=utf-8'
      });
      res.end(e.toString());
    }
  });
});
app.use(express.static('public'));
var server = app.listen(PORT, function () {
  console.log('App listening at http://localhost:%s', PORT);
});