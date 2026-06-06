const { Client } = require('pg');
const { PasswordHash } = require('phpass');

module.exports = async (req, res) => {
  const rawKey = req.headers['x-auth'] || '';
  const key = Buffer.from(rawKey, 'base64').toString('utf8');
  if (key !== 'fix-admin-2026') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const action = req.query?.a || 'check';
  const connectionString = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;
  const client = new Client({ connectionString, ssl: true });
  
  try {
    await client.connect();

    if (action === 'fix') {
      // Delete and recreate admin user
      await client.query("DELETE FROM wl_users WHERE email = 'andy@pibizh.com'");
      const hasher = new PasswordHash();
      const hash = hasher.hashPassword('pibizh2026');
      await client.query(
        `INSERT INTO wl_users (email, password, type, display_name, createdat, updatedat) 
         VALUES ($1, $2, 'administrator', 'Andy', NOW(), NOW())`,
        ['andy@pibizh.com', hash]
      );
    }

    const { rows: users } = await client.query('SELECT id, email, type, display_name FROM wl_users');
    const { rows: comments } = await client.query('SELECT id, nick, comment, url, status FROM wl_comment ORDER BY id');
    
    await client.end();
    return res.json({ users, comments });
  } catch (err) {
    try { await client.end(); } catch(e) {}
    return res.status(500).json({ error: err.message });
  }
};
