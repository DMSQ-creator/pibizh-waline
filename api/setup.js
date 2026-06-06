const { Client } = require('pg');
const { PasswordHash } = require('phpass');

module.exports = async (req, res) => {
  const key = req.query.key;
  if (key !== 'fix-admin-2026') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const action = req.query.action || 'check';
  const connectionString = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;
  if (!connectionString) {
    return res.status(500).json({ error: 'No database connection string' });
  }

  const client = new Client({ connectionString, ssl: true });
  
  try {
    await client.connect();

    if (action === 'reset') {
      // Delete existing user and recreate cleanly
      await client.query("DELETE FROM wl_users WHERE email = 'andy@pibizh.com'");
      
      // Create with correct hash
      const hasher = new PasswordHash();
      const hash = hasher.hashPassword('pibizh2026');
      
      await client.query(
        `INSERT INTO wl_users (email, password, type, display_name, createdat, updatedat) VALUES ($1, $2, 'administrator', 'Andy', NOW(), NOW())`,
        ['andy@pibizh.com', hash]
      );
      
      // Verify
      const hasher2 = new PasswordHash();
      const { rows } = await client.query('SELECT * FROM wl_users WHERE email = $1', ['andy@pibizh.com']);
      const verify = hasher2.checkPassword('pibizh2026', rows[0].password);
      
      await client.end();
      return res.json({ action: 'reset', success: true, verifyPassword: verify, user: { email: rows[0].email, type: rows[0].type } });
    }

    // Check mode
    const { rows: users } = await client.query('SELECT * FROM wl_users');
    const results = [];
    for (const u of users) {
      const hasher = new PasswordHash();
      let verify = false;
      try { verify = hasher.checkPassword('pibizh2026', u.password); } catch(e) { verify = e.message; }
      results.push({ id: u.id, email: u.email, type: u.type, display_name: u.display_name, passwordPrefix: u.password.substring(0,15), verify });
    }
    
    await client.end();
    return res.json({ action: 'check', users: results });
  } catch (err) {
    try { await client.end(); } catch(e) {}
    return res.status(500).json({ error: err.message, stack: err.stack });
  }
};
