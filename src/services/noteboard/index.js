let fs = require('fs-extra')
let google = require('./google')
let _ = require('lodash')
let moment = require('moment')

let save = () => {
    global.io.emit('status', status)
    fs.writeJSONSync(`${__basedir}/data/status.json`, status.user)
}

let restore = () => fs.readJSONSync(`${__basedir}/data/status.json`)

let status = { user: restore() }

global.io.on('connection', (socket) => {
    console.log('Client connected');
    socket.on('disconnect', () => console.log('Client disconnected'));
    socket.emit('status', status)
});

const checkCalendar = async () => {
    const event = _.first(await google.listEvents())
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

setInterval(checkCalendar, 60000)
checkCalendar()

module.exports = {
    microservices: [
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
            handle: google.listEvents
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
        path: '/status',
        localPath: './status'
    }]
}