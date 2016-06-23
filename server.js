const https = require('https');
const fs = require('fs');
const connect = require('connect');
const logger = require('morgan');
const serveStatic = require('serve-static');

const options = {
  cert: fs.readFileSync('./keys/localhost.cert'),
  key: fs.readFileSync('./keys/localhost.key')
};

const app = connect()
  .use(logger('dev'))
  .use(serveStatic(process.cwd()))

https.createServer(options, app).listen(3000);
