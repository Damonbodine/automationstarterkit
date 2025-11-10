// check_scopes.mjs
import { google } from 'googleapis';
import readline from 'readline';

// --- Configuration ---
// You can get these from your Google Cloud project's "Credentials" page.
// This script will prompt you to enter them securely.
let GOOGLE_CLIENT_ID = '';
let GOOGLE_CLIENT_SECRET = '';
const REDIRECT_URI = 'http://localhost:3000/api/auth/callback/google'; // A redirect URI configured for your client

// The scopes you want to check, as defined in your project plan.
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/userinfo.email', // Also good to include
  'https://www.googleapis.com/auth/userinfo.profile', // Also good to include
];

// --- Main function ---
async function main() {
  console.log("This script will help you programmatically check if your OAuth consent screen is configured correctly.");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  // Prompt for credentials securely
  GOOGLE_CLIENT_ID = await new Promise(resolve => rl.question('Enter your Google Client ID: ', resolve));
  GOOGLE_CLIENT_SECRET = await new Promise(resolve => rl.question('Enter your Google Client Secret: ', resolve));
  rl.close();

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    console.error('\nClient ID and Client Secret are required.');
    return;
  }

  // 1. Create an OAuth2 client
  const oauth2Client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    REDIRECT_URI
  );

  // 2. Generate the authentication URL
  // This URL is what your application would redirect users to.
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline', // 'offline' gets you a refresh token
    scope: SCOPES,
    prompt: 'consent', // Forces the consent screen to be shown every time
  });

  // 3. Display the URL
  console.log('\n--- Verification URL ---');
  console.log('Copy and paste the following URL into your web browser:\n');
  console.log(authUrl);
  console.log('\n--- What to look for ---');
  console.log('✅ If successful, you will see a Google consent screen asking for permission to access the scopes you configured.');
  console.log('❌ If it fails, you will likely see an "Error 400: invalid_scope" or a similar message, which means the scopes are not correctly configured on your OAuth consent screen.');
}

main().catch(console.error);