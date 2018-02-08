var express = require('express');
var formidable = require('formidable')

var app = express();
const PORT = 8000;

app.use(express.static('public'));
app.post('/savefile', function (req, res) {
  var form = new formidable.IncomingForm();
  form.parse(req, function(err, fields, files) {
    res.writeHead(200, {'content-type': 'text/plain'});
    res.end(util.inspect({fields: fields, files: files}));
  });
});

var server = app.listen(PORT, function () {
  console.log('App listening at http://localhost:%s', PORT);
});