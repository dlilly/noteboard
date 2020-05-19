// local utils
global.__basedir = require('app-root-path');
global.utils = require('./common/utils');
global.config = require('./common/config');
global.logger = console

// npm packages
const cors = require('cors');
const bodyParser = require('body-parser');
const express = require('express');

// express app setup
const app = express();
const port = config.get('port') || 3001;

let commonHandlers = require('./common/common_handlers')

const server = app.listen(port);

const SocketIO = require('socket.io')
const io = SocketIO(server)
global.io = io

const serviceLoader = require('./common/serviceloader');
app.use(bodyParser.text({ type: 'text/plain' }));
app.use(bodyParser.json());

// CORS support
app.use(cors());

// log each HTTP request
app.use(commonHandlers.log);

// load the UI
app.use('/ui', express.static(`${__dirname}/common/ui`));

// load the services
app.use(serviceLoader)

// global error handler
app.use(commonHandlers.error);

logger.info(`Server started on port: ${port}`);
logger.info(`Application directory: ${__basedir}`)