const { google } = require('googleapis')

const oauth2Client = new google.auth.OAuth2(
  '573603178132-fvocepjjhmbn9786h0j78okaf1me5udn.apps.googleusercontent.com',
  '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',
  'http://localhost:3000/callback'
)

async function getToken() {
  const { tokens } = await oauth2Client.getToken('4/0AeoWuM8GzG8XKxgGuFmgidHGvF28GffDaXflDMsbXdtYaV_e6Bx56Q6Z9jtFRYQSYCJBMg')
  console.log('\n=== REFRESH TOKEN ===')
  console.log(tokens.refresh_token)
  console.log('====================\n')
}

getToken().catch(console.error)