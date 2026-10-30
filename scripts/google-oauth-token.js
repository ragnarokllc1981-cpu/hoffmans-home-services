// One-time setup: mint a Gmail (send-only) refresh token for api/leads.js and store
// GOOGLE_OAUTH_CLIENT_ID / _SECRET / _REFRESH_TOKEN in Vercel production.
//
//   node scripts/google-oauth-token.js [path-to-client_secret.json]
//
// Without a path it takes the newest client_secret_*.json in ~/Downloads and
// deletes it once all three values are stored. Secrets are never printed.
import { spawnSync, exec } from 'node:child_process';
import { readdirSync, readFileSync, statSync, unlinkSync } from 'node:fs';
import { createServer } from 'node:http';
import { homedir } from 'node:os';
import { join } from 'node:path';

const SCOPE = 'https://www.googleapis.com/auth/gmail.send';
const LOGIN_HINT = 'ragnarokllc1981@gmail.com';

function findClientFile() {
  if (process.argv[2]) return process.argv[2];
  const dir = join(homedir(), 'Downloads');
  const files = readdirSync(dir).filter(f => /^client_secret_.*\.json$/.test(f))
    .map(f => join(dir, f)).sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
  if (!files.length) throw new Error(`No client_secret_*.json found in ${dir}`);
  return files[0];
}

function addEnv(name, value) {
  spawnSync('npx', ['vercel', 'env', 'rm', name, 'production', '--yes'], { shell: true, stdio: 'ignore' });
  const r = spawnSync('npx', ['vercel', 'env', 'add', name, 'production'], { input: value, shell: true, stdio: ['pipe', 'ignore', 'pipe'] });
  if (r.status !== 0) throw new Error(`vercel env add ${name} failed: ${r.stderr}`);
  console.log(`Saved ${name} in Vercel (production).`);
}

const file = findClientFile();
const creds = JSON.parse(readFileSync(file, 'utf8'));
const { client_id: clientId, client_secret: clientSecret } = creds.installed ?? creds.web ?? {};
if (!clientId || !clientSecret) throw new Error('That file is not an OAuth client (no client_id/client_secret).');

const server = createServer();
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const redirectUri = `http://127.0.0.1:${server.address().port}`;
const url = 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({
  client_id: clientId, redirect_uri: redirectUri, response_type: 'code', scope: SCOPE,
  access_type: 'offline', prompt: 'consent', login_hint: LOGIN_HINT,
});
console.log('\nOpening Google sign-in. If no browser tab opens, visit:\n' + url + '\n');
exec(`start "" "${url}"`);

const code = await new Promise((resolve, reject) => {
  server.on('request', (req, res) => {
    const params = new URL(req.url, redirectUri).searchParams;
    if (!params.has('code') && !params.has('error')) return res.end();
    res.setHeader('Content-Type', 'text/html');
    res.end('<h2>Done. You can close this tab and go back to Claude.</h2>');
    server.close();
    if (params.get('code')) resolve(params.get('code'));
    else reject(new Error(`Google said: ${params.get('error')}`));
  });
});

const tokens = await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST',
  body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code' }),
}).then(r => r.json());
if (!tokens.refresh_token) throw new Error(`Google did not return a refresh token (${tokens.error || 'unknown'}). Run again.`);

addEnv('GOOGLE_OAUTH_CLIENT_ID', clientId);
addEnv('GOOGLE_OAUTH_CLIENT_SECRET', clientSecret);
addEnv('GOOGLE_OAUTH_REFRESH_TOKEN', tokens.refresh_token);

if (!process.argv[2]) { unlinkSync(file); console.log(`Deleted ${file}`); }
console.log('All set.');
