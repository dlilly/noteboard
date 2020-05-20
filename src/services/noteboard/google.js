const fs = require('fs-extra');
const readline = require('readline');
const {google} = require('googleapis');

/**
 * Lists the next 10 events on the user's primary calendar.
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
function listEvents(auth) {
  return new Promise(async (resolve, reject) => {
    // return resolve(fs.readJSONSync(`${__basedir}/data/mock-google-data.json`))

    const calendar = google.calendar({version: 'v3', auth});
    calendar.events.list({
      calendarId: 'primary',
      timeMin: (new Date()).toISOString(),
      maxResults: 2,
      singleEvents: true,
      orderBy: 'startTime',
    }, (err, res) => {
      if (err) reject('The API returned an error: ' + err);
      resolve(res.data.items);
    });
  })
}

module.exports = { listEvents }