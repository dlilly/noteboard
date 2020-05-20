let fs = require('fs-extra')
let _ = require('lodash')
let moment = require('moment')

let save = () => {
    global.io.emit('status', status)
    fs.writeJSONSync(`${__basedir}/data/status.json`, status.user)
}

let restore = () => fs.readJSONSync(`${__basedir}/data/status.json`)

let status = { user: restore() }

global.io.on('connection', (socket) => {
    socket.emit('status', status)
});

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

// setInterval(checkCalendar, 60000)
// checkCalendar()

let tokens = fs.existsSync('/tmp/tokens.json') && fs.readJSONSync('/tmp/tokens.json')

const { google } = require('googleapis');

const oauth2Client = new google.auth.OAuth2(
  '958947031379-qpp6d9edrgshbjp0h9rao7b6q5jaohgi.apps.googleusercontent.com',
  'CvFESxnrlVULKrtxrWYSqFz6',
  'https://ctp.ngrok.io/oauth/callback'
);

if (tokens) {
    oauth2Client.setCredentials(tokens)
}

let gclient = require('./google')

module.exports = {
    microservices: [
        {
            path: '/oauth/callback',
            handle: async ({ query }, res) => {
                const resp = await oauth2Client.getToken(query.code)

                console.log(JSON.stringify(resp))
                oauth2Client.setCredentials(resp.tokens);

                // cache these in /tmp
                fs.writeJSONSync('/tmp/tokens.json', resp.tokens)

                res.redirect(`https://ctp.ngrok.io/status/`)
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
            tokens = fs.existsSync('/tmp/tokens.json') && fs.readJSONSync('/tmp/tokens.json')
            if (tokens) {
                oauth2Client.setCredentials(tokens)
                next()
            }
            else {    
                const scopes = ['https://www.googleapis.com/auth/calendar'];
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