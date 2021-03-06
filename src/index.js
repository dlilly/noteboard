// local utils
global.__basedir = require('app-root-path');
global.utils = require('./common/utils');
global.config = require('./common/config');
global.logger = console

// npm packages
const cors = require('cors');
const bodyParser = require('body-parser');
const express = require('express');

// get the api key
const fs = require('fs-extra')
const { v4 } = require('uuid')

let apiKey = fs.existsSync('apiKey.txt') && fs.readFileSync('apiKey.txt').toString()
if (!apiKey) {
    apiKey = v4()
    fs.writeFileSync('apiKey.txt', apiKey, { encoding: 'utf8' })
}

// express app setup
const app = express();
const port = config.get('PORT') || config.get('port') || 3001;

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

// for the apis, enforce an apikey
app.use((req, res, next) => {
    if (req.path.indexOf('/api') > -1) {
        if (apiKey === req.headers['api-key']) {
            next()
        }
        else {
            next(`Invalid API key`)
        }
    }
    else {
        next()
    }
})

// load the services
app.use(serviceLoader)

// global error handler
app.use(commonHandlers.error);

logger.info(`Server started on port: ${port}`);
logger.info(`Application directory: ${__basedir}`)