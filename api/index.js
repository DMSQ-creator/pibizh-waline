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

const { PasswordHash } = require('phpass');
const { Client } = require('pg');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

function parseBody(req) {
  return new Promise(async (resolve) => {
    try {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const raw = Buffer.concat(chunks).toString();
      if (req.headers['content-type']?.includes('json')) {
        resolve(JSON.parse(raw));
      } else {
        resolve(Object.fromEntries(new URLSearchParams(raw)));
      }
    } catch(e) {
      resolve({});
    }
  });
}

function setCORS(req, res) {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
}

function verifyToken(req) {
  const auth = req.headers.authorization || '';
  const token = auth.replace('Bearer ', '');
  if (!token) return null;
  try {
    const jwtKey = process.env.JWT_TOKEN || process.env.POSTGRES_PASSWORD;
    const decoded = jwt.verify(token, jwtKey);
    return String(decoded);
  } catch(e) {
    return null;
  }
}

async function customLogin(req) {
  const body = await parseBody(req);
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

async function customCommentList(req) {
  const userId = verifyToken(req);
  if (!userId) return { errno: 1000, errmsg: 'Unauthorized' };

  const connStr = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;
  const client = new Client({ connectionString: connStr, ssl: true });

  try {
    await client.connect();
    
    // Check if user is admin
    const { rows: users } = await client.query('SELECT type FROM wl_users WHERE id = $1', [userId]);
    if (users.length === 0 || users[0].type !== 'administrator') {
      await client.end();
      return { errno: 403, errmsg: 'Forbidden' };
    }

    // Parse query params
    const url = new URL(req.url, 'https://placeholder');
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '10');
    const offset = (page - 1) * pageSize;

    // Get total count
    const { rows: countRows } = await client.query('SELECT count(*) as cnt FROM wl_comment');
    const total = parseInt(countRows[0].cnt);

    // Get comments
    const { rows: comments } = await client.query(
      'SELECT * FROM wl_comment ORDER BY insertedat DESC LIMIT $1 OFFSET $2',
      [pageSize, offset]
    );

    await client.end();

    // Format for Waline admin UI
    const data = comments.map(c => ({
      objectId: c.id,
      nick: c.nick,
      mail: c.mail,
      link: c.link,
      url: c.url,
      comment: c.comment,
      insertedAt: c.insertedat,
      createdAt: c.insertedat,
      updatedAt: c.updatedat,
      status: c.status || 'approved',
      like: c.like || 0,
      dislike: c.dislike || 0,
      sticky: c.sticky || false,
      isSpam: c.is_spam || false,
      user_id: c.user_id,
      ip: c.ip,
      pid: c.pid,
      rid: c.rid,
      avatar: c.avatar_url || `https://seccdn.libravatar.org/avatar/${crypto.createHash('md5').update(c.mail || '').digest('hex')}`,
    }));

    return {
      errno: 0,
      errmsg: '',
      data: {
        page,
        totalPages: Math.ceil(total / pageSize),
        pageSize,
        count: total,
        data,
      }
    };
  } catch(e) {
    try { await client.end(); } catch(e2) {}
    return { errno: 500, errmsg: e.message };
  }
}

async function customCommentUpdate(req) {
  const userId = verifyToken(req);
  if (!userId) return { errno: 1000, errmsg: 'Unauthorized' };

  const connStr = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;
  const client = new Client({ connectionString: connStr, ssl: true });

  try {
    await client.connect();
    
    const { rows: users } = await client.query('SELECT type FROM wl_users WHERE id = $1', [userId]);
    if (users.length === 0 || users[0].type !== 'administrator') {
      await client.end();
      return { errno: 403, errmsg: 'Forbidden' };
    }

    const body = await parseBody(req);
    
    // Extract comment ID from URL: /api/comment/:id
    const urlParts = req.url.split('/');
    const commentId = urlParts[urlParts.length - 1]?.split('?')[0];

    if (!commentId) {
      await client.end();
      return { errno: 1000, errmsg: 'Missing comment ID' };
    }

    // Update comment
    const updates = [];
    const values = [];
    let idx = 1;

    if (body.status !== undefined) { updates.push(`status = $${idx++}`); values.push(body.status); }
    if (body.isSpam !== undefined) { updates.push(`is_spam = $${idx++}`); values.push(body.isSpam); }
    if (body.sticky !== undefined) { updates.push(`sticky = $${idx++}`); values.push(body.sticky); }
    if (body.comment !== undefined) { updates.push(`comment = $${idx++}`); values.push(body.comment); }

    if (updates.length === 0) {
      await client.end();
      return { errno: 1000, errmsg: 'No fields to update' };
    }

    values.push(commentId);
    await client.query(`UPDATE wl_comment SET ${updates.join(', ')} WHERE id = $${idx}`, values);
    
    await client.end();
    return { errno: 0, errmsg: '' };
  } catch(e) {
    try { await client.end(); } catch(e2) {}
    return { errno: 500, errmsg: e.message };
  }
}

async function customCommentDelete(req) {
  const userId = verifyToken(req);
  if (!userId) return { errno: 1000, errmsg: 'Unauthorized' };

  const connStr = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;
  const client = new Client({ connectionString: connStr, ssl: true });

  try {
    await client.connect();
    
    const { rows: users } = await client.query('SELECT type FROM wl_users WHERE id = $1', [userId]);
    if (users.length === 0 || users[0].type !== 'administrator') {
      await client.end();
      return { errno: 403, errmsg: 'Forbidden' };
    }

    const urlParts = req.url.split('/');
    const commentId = urlParts[urlParts.length - 1]?.split('?')[0];

    await client.query('DELETE FROM wl_comment WHERE id = $1', [commentId]);
    await client.end();
    return { errno: 0, errmsg: '' };
  } catch(e) {
    try { await client.end(); } catch(e2) {}
    return { errno: 500, errmsg: e.message };
  }
}

module.exports = async (req, res) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    setCORS(req, res);
    res.status(204).end();
    return;
  }

  // Intercept /api/token POST (login)
  if (req.url === '/api/token' && req.method === 'POST') {
    const result = await customLogin(req);
    setCORS(req, res);
    res.status(result.errno === 0 ? 200 : 400);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(result));
    return;
  }

  // Intercept /api/comment?type=list (admin comment list)
  if (req.url.startsWith('/api/comment') && req.url.includes('type=list') && req.method === 'GET') {
    const result = await customCommentList(req);
    setCORS(req, res);
    res.status(result.errno === 0 ? 200 : 400);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(result));
    return;
  }

  // Intercept /api/comment/:id PUT (update comment)
  if (req.url.match(/\/api\/comment\/\d+/) && req.method === 'PUT') {
    const result = await customCommentUpdate(req);
    setCORS(req, res);
    res.status(result.errno === 0 ? 200 : 400);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(result));
    return;
  }

  // Intercept /api/comment/:id DELETE (delete comment)
  if (req.url.match(/\/api\/comment\/\d+/) && req.method === 'DELETE') {
    const result = await customCommentDelete(req);
    setCORS(req, res);
    res.status(result.errno === 0 ? 200 : 400);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(result));
    return;
  }

  // Pass everything else to Waline
  return walineHandler(req, res);
};
