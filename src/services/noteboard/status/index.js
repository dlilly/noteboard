var socket = io();
var el;

const iconMap = {
    caution: 'exclamation-triangle',
    busy: 'times-circle',
    free: 'check'
}

$(document).ready(() => {
    socket.on('status', function(status) {
        console.log(JSON.stringify(status))

        $('#body').removeClass('free busy caution')
        $('#body').addClass(status.meeting.status || status.user.status)
        $('#message').html(status.meeting.message || status.user.message)

        $('#comingUp').html(status.meeting.statusText)
        $('#nextMeeting').html(status.meeting.summary)
        $('#nextMeetingStartTime').html(`${status.meeting.duration}`)
        $('#icon').removeClass('fa-exclamation-triangle fa-times-circle fa-check')
        $('#icon').addClass(`fa fa-${iconMap[status.meeting.status || status.user.status]}`)
    });
})