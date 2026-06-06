const { Client } = require('pg');
const { PasswordHash } = require('phpass');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

module.exports = async (req, res) => {
  // Password reset endpoint
  if (req.url?.includes('reset')) {
    const rawKey = req.headers['x-auth'] || '';
    const key = Buffer.from(rawKey, 'base64').toString('utf8');
    if (key !== 'fix-admin-2026') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    let body = {};
    try {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      body = JSON.parse(Buffer.concat(chunks).toString());
    } catch(e) {}

    const newPw = body.newPassword || 'admin2026';
    const connectionString = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;
    const client = new Client({ connectionString, ssl: true });

    try {
      await client.connect();
      const hasher = new PasswordHash();
      const hash = hasher.hashPassword(newPw);
      await client.query("UPDATE wl_users SET password = $1 WHERE email = 'andy@pibizh.com'", [hash]);
      
      // Verify
      const { rows } = await client.query("SELECT password FROM wl_users WHERE email = 'andy@pibizh.com'");
      const verify = hasher.checkPassword(newPw, rows[0].password);
      await client.end();
      
      return res.json({ success: true, password: newPw, verify });
    } catch(e) {
      try { await client.end(); } catch(e2) {}
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let body = {};
  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    body = JSON.parse(Buffer.concat(chunks).toString());
  } catch(e) {
    return res.status(400).json({ errno: 1000, errmsg: 'Invalid request body' });
  }

  const { email, password } = body;
  if (!email || !password) {
    return res.status(400).json({ errno: 1000, errmsg: 'Email and password required' });
  }

  const connectionString = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;
  const client = new Client({ connectionString, ssl: true });

  try {
    await client.connect();
    const { rows: users } = await client.query('SELECT * FROM wl_users WHERE email = $1', [email]);

    if (users.length === 0) {
      await client.end();
      return res.json({ errno: 1000, errmsg: 'User not found' });
    }

    const user = users[0];

    if (/^verify:/iu.test(user.type)) {
      await client.end();
      return res.json({ errno: 1000, errmsg: 'User not verified' });
    }
    if (user.type === 'banned') {
      await client.end();
      return res.json({ errno: 1000, errmsg: 'User banned' });
    }

    const hasher = new PasswordHash();
    const valid = hasher.checkPassword(password, user.password);
    if (!valid) {
      await client.end();
      return res.json({ errno: 1000, errmsg: 'Wrong password' });
    }

    const jwtKey = process.env.JWT_TOKEN || process.env.POSTGRES_PASSWORD;
    const token = jwt.sign(String(user.id), jwtKey);

    await client.end();

    return res.json({
      errno: 0,
      errmsg: '',
      data: {
        display_name: user.display_name,
        email: user.email,
        type: user.type,
        avatar_url: user.avatar_url,
        url: user.url,
        objectId: user.id,
        createdAt: user.createdat,
        updatedAt: user.updatedat,
        avatar: user.avatar_url || `https://seccdn.libravatar.org/avatar/${crypto.createHash('md5').update(user.mail || user.email).digest('hex')}`,
        token,
      }
    });
  } catch (err) {
    try { await client.end(); } catch(e) {}
    return res.status(500).json({ errno: 1000, errmsg: err.message });
  }
};
