let fs = require('fs-extra')
let _ = require('lodash')
let moment = require('moment')
let gclient = require('./google')

let tokens = fs.existsSync('tokens.json') && fs.readJSONSync('tokens.json')

const { google } = require('googleapis');

const oauth2Client = new google.auth.OAuth2(
  global.config.get('OAUTH_CLIENT_ID'),
  global.config.get('OAUTH_CLIENT_SECRET'),
  global.config.get('OAUTH_CALLBACK_URI')
);

const checkCalendar = async () => {
    const event = _.first(await gclient.listEvents(oauth2Client))
    const eventStart = moment(event.start.dateTime)
    const invitationAccepted = _.get(_.find(event.attendees, att => att.self), 'responseStatus') === 'accepted'
    const meetingInProgress = eventStart.isBefore(moment())

    status.meeting = {
        status: meetingInProgress && (invitationAccepted ? 'busy' : 'caution'),
        message: meetingInProgress && (invitationAccepted ? 'On a Call' : 'Knock first'),
        inProgress: meetingInProgress,
        summary: event.summary,
        statusText: meetingInProgress ? 'In Progress' : 'Coming Up',
        duration: meetingInProgress ? `ends ${moment(event.end.dateTime).fromNow()}` : `starts ${eventStart.fromNow()}`
    }

    save()
}

if (tokens) {
    oauth2Client.setCredentials(tokens)
    setInterval(checkCalendar, 60000)
    checkCalendar()
}

let save = () => {
    global.io.emit('status', status)
    fs.writeJSONSync(`${__basedir}/data/status.json`, status.user)
}

let restore = () => fs.readJSONSync(`${__basedir}/data/status.json`)

let status = { user: restore() }

global.io.on('connection', (socket) => {
    socket.emit('status', status)
});

module.exports = {
    microservices: [
        {
            path: '/oauth/callback',
            handle: async ({ query }, res) => {
                const resp = await oauth2Client.getToken(query.code)

                oauth2Client.setCredentials(resp.tokens)
                setInterval(checkCalendar, 60000)
                checkCalendar()
            
                // cache these in /tmp
                fs.writeJSONSync('tokens.json', resp.tokens)

                res.redirect(`https://noteboard-rrtxps.herokuapp.com/status/`)
            }
        },
        {
            path: '/api/status',
            handle: async () => status
        },
        {
            path: '/api/status',
            method: 'put',
            handle: checkCalendar
        },
        {
            path: '/api/events',
            handle: async () => await gclient.listEvents(oauth2Client)
        },
        {
            path: '/api/status',
            method: 'post',
            handle: async ({ body }) => {
                status.user = body
                save()
                return status
            }
        }
    ],
    ui: [{
        middleware: (req, res, next) => {
            tokens = fs.existsSync('tokens.json') && fs.readJSONSync('tokens.json')
            if (tokens) {
                oauth2Client.setCredentials(tokens)
                next()
            }
            else {    
                const scopes = ['https://www.googleapis.com/auth/calendar.events.readonly'];
                const url = oauth2Client.generateAuthUrl({
                  // 'online' (default) or 'offline' (gets refresh_token)
                  access_type: 'offline',
                
                  // If you only need one scope you can pass it as a string
                  scope: scopes,

                  prompt: 'consent'
                });
                res.redirect(url)
            }
        },
        path: '/status',
        localPath: './status'
    }]
}