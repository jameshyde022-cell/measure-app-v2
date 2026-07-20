const fs = require('fs');
const path = require('path');

const CONSOLE_LOG_PATH = path.join(__dirname, '..', 'test-results', 'console-log.ndjson');

function ensureResultsDir() {
  const dir = path.dirname(CONSOLE_LOG_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

/**
 * Attaches console/page-error listeners to a page and appends any
 * error/warning entries to a shared NDJSON log file so the whole suite's
 * console output can be reviewed together at the end, regardless of which
 * spec file or page it came from.
 */
function captureConsole(page, label) {
  ensureResultsDir();
  page.on('console', (msg) => {
    const type = msg.type();
    if (type !== 'error' && type !== 'warning') return;
    const entry = { label, url: page.url(), type, text: msg.text(), ts: new Date().toISOString() };
    try { fs.appendFileSync(CONSOLE_LOG_PATH, JSON.stringify(entry) + '\n'); } catch {}
  });
  page.on('pageerror', (err) => {
    const entry = { label, url: page.url(), type: 'pageerror', text: err.message, ts: new Date().toISOString() };
    try { fs.appendFileSync(CONSOLE_LOG_PATH, JSON.stringify(entry) + '\n'); } catch {}
  });
}

function randomTestEmail(tag = 'a') {
  return `measure-pw-test-${tag}-${Date.now()}-${Math.floor(Math.random() * 100000)}@mailinator.com`;
}

const TEST_PASSWORD = 'PwTest1234!';

/**
 * Pre-existing, already-verified production accounts on this exact project.
 * Reused across specs instead of new signups because Supabase Auth's signup
 * rate limit is hit project-wide (login is unaffected — only NEW signups
 * are rate-limited). Neither account is an admin. Keep export-quota usage
 * split across specs deliberately: see comments in each spec file for which
 * account owns which daily export "budget".
 */
const EXISTING_ACCOUNTS = {
  A: { email: 'measure-launch-test-1784535218@mailinator.com', password: 'TestPassword123!' },
  B: { email: 'measure-launch-test-user2-1784538943@mailinator.com', password: 'TestPassword456!' },
};

/** Fills and submits the signup form. Assumes page is already on /signup. */
async function signup(page, email, password = TEST_PASSWORD) {
  await page.goto('/signup');
  await page.getByPlaceholder('you@example.com').fill(email);
  await page.getByPlaceholder('••••••••').fill(password);
  await page.getByRole('button', { name: /create account/i }).click();
}

/** Fills and submits the login form, waiting for redirect away from /login. */
async function login(page, email, password = TEST_PASSWORD) {
  await page.goto('/login');
  await page.getByPlaceholder('you@example.com').fill(email);
  await page.getByPlaceholder('••••••••').fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 20000 });
}

/** Logs out via the API directly (works from any page, cookies shared with context). */
async function logoutViaApi(page) {
  await page.request.post('/api/auth/logout');
}

module.exports = { captureConsole, randomTestEmail, TEST_PASSWORD, EXISTING_ACCOUNTS, signup, login, logoutViaApi, CONSOLE_LOG_PATH };
