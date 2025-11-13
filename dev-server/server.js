const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const argon2 = require('argon2');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-please-change';
const SERVER_PEPPER = process.env.SERVER_PEPPER || '';

app.use(bodyParser.json());

// simple in-memory user store for dev
// For the demo we keep an argon2-hashed password and a password history per user
const USERS = {
  'demo@example.com': { id: 'user-demo', firstName: 'Demo', lastName: 'User' }
};

// password hashes and history (in-memory)
const PASSWORD_HASH = {}; // userId -> current argon2 encoded hash
const PASSWORD_HISTORY = {}; // userId -> array of { argon_hash, createdAt }
const HISTORY_DEPTH = 5;

async function ensureDemoUser() {
  const email = 'demo@example.com';
  const user = USERS[email];
  if (!user) return;
  if (!PASSWORD_HASH[user.id]) {
    // initialize with DevPass (synchronously once)
    const initial = 'DemoPass123';
    const input = initial + SERVER_PEPPER;
    const encoded = await argon2.hash(input, { type: argon2.argon2id });
    PASSWORD_HASH[user.id] = encoded;
    PASSWORD_HISTORY[user.id] = [{ argon_hash: encoded, createdAt: new Date().toISOString() }];
    console.log('Initialized demo user password hash/history');
  }
}

// login verifies argon2 hash
app.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ ok: false, reason: 'missing' });
  const user = USERS[email.toLowerCase()];
  if (!user) return res.status(401).json({ ok: false, reason: 'invalid' });
  const currentHash = PASSWORD_HASH[user.id];
  if (!currentHash) return res.status(500).json({ ok: false, reason: 'server-misconfigured' });
  try {
    const ok = await argon2.verify(currentHash, password + SERVER_PEPPER);
    if (!ok) return res.status(401).json({ ok: false, reason: 'invalid' });
    const payload = { sub: user.id, email: email.toLowerCase() };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
    res.json({ ok: true, token });
  } catch (e) {
    console.error('login error', e);
    res.status(500).json({ ok: false, reason: 'error' });
  }
});

// endpoint: check password reuse and change password
// POST /change-password { email, newPassword }
app.post('/change-password', async (req, res) => {
  const { email, newPassword } = req.body || {};
  if (!email || !newPassword) return res.status(400).json({ ok: false, reason: 'missing' });
  const user = USERS[email.toLowerCase()];
  if (!user) return res.status(404).json({ ok: false, reason: 'unknown_user' });
  const userId = user.id;
  const history = PASSWORD_HISTORY[userId] || [];
  try {
    // Check reuse by verifying candidate against each historical hash
    for (const entry of history) {
      const matches = await argon2.verify(entry.argon_hash, newPassword + SERVER_PEPPER);
      if (matches) return res.status(400).json({ ok: false, reason: 'reused_password' });
    }

    // Not reused — hash new password and push into history
    const newHash = await argon2.hash(newPassword + SERVER_PEPPER, { type: argon2.argon2id });
    PASSWORD_HASH[userId] = newHash;
    history.unshift({ argon_hash: newHash, createdAt: new Date().toISOString() });
    // trim
    PASSWORD_HISTORY[userId] = history.slice(0, HISTORY_DEPTH);

    return res.json({ ok: true });
  } catch (e) {
    console.error('change-password error', e);
    return res.status(500).json({ ok: false, reason: 'error' });
  }
});

// Debug endpoint (demo only) to view history metadata (not hashes)
app.get('/password-history', (req, res) => {
  const email = req.query.email;
  if (!email) return res.status(400).json({ ok: false, reason: 'missing' });
  const user = USERS[email.toLowerCase()];
  if (!user) return res.status(404).json({ ok: false, reason: 'unknown_user' });
  const history = (PASSWORD_HISTORY[user.id] || []).map(h => ({ createdAt: h.createdAt }));
  res.json({ ok: true, history });
});

app.get('/', (req, res) => res.send('Dev server running. POST /login, POST /change-password, GET /password-history'));

(async () => {
  await ensureDemoUser();
  app.listen(PORT, () => console.log(`Dev server listening on http://localhost:${PORT}`));
})();
