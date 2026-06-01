const { google } = require('googleapis')

const oauth2Client = new google.auth.OAuth2(
  '573603178132-fvocepjjhmbn9786h0j78okaf1me5udn.apps.googleusercontent.com',
  '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',
  'http://localhost:3000/callback'
)

const url = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: ['https://www.googleapis.com/auth/drive'],
  prompt: 'consent'
})

console.log('\n=== BUKA URL INI DI BROWSER ===\n')
console.log(url)
console.log('\n===============================\n')