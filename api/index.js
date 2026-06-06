const connectionString = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;

if (connectionString) {
  try {
    const url = new URL(connectionString);
    process.env.POSTGRES_HOST = url.hostname;
    process.env.POSTGRES_PORT = url.port || '5432';
    process.env.POSTGRES_USER = url.username;
    process.env["POSTGRES_PASSWORD"] = url["password"].split("%").length > 1 ? unescape(url["password"]) : url["password"];
    process.env.POSTGRES_DATABASE = url.pathname.slice(1);
    process.env.POSTGRES_SSL = 'true';
  } catch(e) {
    console.error('Failed to parse connection string:', e.message);
  }
}

if (!process.env.JWT_KEY) {
  process.env.JWT_KEY = process.env.POSTGRES_PASSWORD || 'default-jwt-key-' + Date.now();
}

if (process.env.SECURE_DOMAINS && !process.env.SECURE_DOMAINS.includes('vercel.app')) {
  process.env.SECURE_DOMAINS = process.env.SECURE_DOMAINS + ',pibizh-waline.vercel.app,pibizh-waline-dmsqcreators-projects.vercel.app';
}

const Waline = require('@waline/vercel');
const walineHandler = Waline();

// Custom login handler that bypasses the broken thinkjs ORM
const { PasswordHash } = require('phpass');
const { Client } = require('pg');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

async function customLogin(req) {
  let body = {};
  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const raw = Buffer.concat(chunks).toString();
    
    if (req.headers['content-type']?.includes('json')) {
      body = JSON.parse(raw);
    } else {
      const params = new URLSearchParams(raw);
      body = Object.fromEntries(params);
    }
  } catch(e) {
    return { errno: 1000, errmsg: 'Invalid body' };
  }

  const { email, password } = body;
  if (!email || !password) return { errno: 1000, errmsg: 'Missing fields' };

  const connStr = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;
  const client = new Client({ connectionString: connStr, ssl: true });

  try {
    await client.connect();
    const { rows: users } = await client.query('SELECT * FROM wl_users WHERE email = $1', [email]);

    if (users.length === 0) { await client.end(); return { errno: 1000 }; }
    const user = users[0];

    if (/^verify:/iu.test(user.type) || user.type === 'banned') { await client.end(); return { errno: 1000 }; }

    const hasher = new PasswordHash();
    if (!hasher.checkPassword(password, user.password)) { await client.end(); return { errno: 1000 }; }

    const jwtKey = process.env.JWT_TOKEN || process.env.POSTGRES_PASSWORD;
    const token = jwt.sign(String(user.id), jwtKey);

    await client.end();

    return {
      errno: 0, errmsg: '',
      data: {
        display_name: user.display_name, email: user.email, type: user.type,
        avatar_url: user.avatar_url, url: user.url, objectId: user.id,
        createdAt: user.createdat, updatedAt: user.updatedat,
        avatar: user.avatar_url || `https://seccdn.libravatar.org/avatar/${crypto.createHash('md5').update(user.mail || user.email).digest('hex')}`,
        token,
      }
    };
  } catch(e) {
    try { await client.end(); } catch(e2) {}
    return { errno: 1000, errmsg: e.message };
  }
}

module.exports = async (req, res) => {
  // Intercept /api/token POST requests with our custom login
  if (req.url === '/api/token' && req.method === 'POST') {
    const result = await customLogin(req);
    res.status(result.errno === 0 ? 200 : 400);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.end(JSON.stringify(result));
    return;
  }

  // Pass everything else to Waline
  return walineHandler(req, res);
};
