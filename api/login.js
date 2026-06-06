const { Client } = require('pg');
const { PasswordHash } = require('phpass');
const jwt = require('jsonwebtoken');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Parse body
  let body = {};
  try {
    if (req.headers['content-type']?.includes('json')) {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      body = JSON.parse(Buffer.concat(chunks).toString());
    } else {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const params = new URLSearchParams(Buffer.concat(chunks).toString());
      body = Object.fromEntries(params);
    }
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

    // Check type
    if (/^verify:/iu.test(user.type)) {
      await client.end();
      return res.json({ errno: 1000, errmsg: 'User not verified' });
    }
    if (user.type === 'banned') {
      await client.end();
      return res.json({ errno: 1000, errmsg: 'User banned' });
    }

    // Check password
    const hasher = new PasswordHash();
    const valid = hasher.checkPassword(password, user.password);
    if (!valid) {
      await client.end();
      return res.json({ errno: 1000, errmsg: 'Wrong password' });
    }

    // Generate JWT token (same as Waline)
    const jwtKey = process.env.JWT_TOKEN || process.env.POSTGRES_PASSWORD;
    const token = jwt.sign(String(user.id), jwtKey);

    await client.end();

    // Return in Waline's format
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
        avatar: user.avatar_url || `https://seccdn.libravatar.org/avatar/${require('crypto').createHash('md5').update(user.mail || user.email).digest('hex')}`,
        token,
      }
    });
  } catch (err) {
    try { await client.end(); } catch(e) {}
    return res.status(500).json({ errno: 1000, errmsg: err.message });
  }
};
