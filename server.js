var express = require('express');
var multer = require('multer');
var morgan = require('morgan');
var path = require('path');

var designauto = require('./routes/design-auto');
var dmapi = require('./routes/dm-api');
var dropbox = require('./routes/dropbox');
  
var cookieParser = require('cookie-parser');
var session = require('express-session');

var app = express();



app.use(cookieParser());

app.use(session({
  secret: 'autodeskderivativeservice',
  resave: false,
  saveUninitialized: false
}));

app.set('view engine', 'ejs');


var done = false;
app.use(multer({
  dest: './uploads/',
  rename: function (fieldname, filename) {
    if(filename == 'test')
      return filename;
    else
      return filename + Date.now();

  },
  onFileUploadStart: function (file) {
    //console.log(file.originalname + ' is starting ...');
    done = false;
  },
  onFileUploadComplete: function (file) {
    console.log(file.fname);
    console.log(file.fieldname + ' uploaded to ' + file.path)
    done = true;
  }
}));

app.post('/api/upload', function (req, res) {
  if (done) {
    //console.log('File uploaded to ' + req.files.msg.path);
    //res.end(req.files.msg.name);
    //console.log(req.file.name);
    console.log('done uploading');
    res.end('ok');
  }
});

app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With");
  next();
});

app.use('/', express.static(__dirname + '/html'));

app.use('/downloads', express.static(__dirname + '/downloads'));

app.use('/uploads', express.static(__dirname + '/uploads'));

app.use('/items', express.static(__dirname + '/items'));

app.use('/designauto', designauto);

app.use('/dmapi', dmapi);

app.use('/dropbox', dropbox);

app.use(morgan('combined'));




app.listen(process.env.PORT || 8000);

console.log('Listening on port 8000...');
