const { Client } = require('pg');
const { PasswordHash } = require('phpass');

module.exports = async (req, res) => {
  const key = req.query.key;
  if (key !== 'fix-admin-2026') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const connectionString = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;
  const client = new Client({ connectionString, ssl: true });
  
  try {
    await client.connect();

    // Nuke existing user and recreate
    await client.query("DELETE FROM wl_users WHERE email = 'andy@pibizh.com'");
    
    const hasher = new PasswordHash();
    const hash = hasher.hashPassword('pibizh2026');
    
    await client.query(
      `INSERT INTO wl_users (email, password, type, display_name, createdat, updatedat) 
       VALUES ($1, $2, 'administrator', 'Andy', NOW(), NOW())`,
      ['andy@pibizh.com', hash]
    );
    
    // Verify
    const { rows } = await client.query('SELECT * FROM wl_users WHERE email = $1', ['andy@pibizh.com']);
    const hasher2 = new PasswordHash();
    const verify = hasher2.checkPassword('pibizh2026', rows[0].password);
    
    await client.end();
    return res.json({ success: true, verify, user: { email: rows[0].email, type: rows[0].type } });
  } catch (err) {
    try { await client.end(); } catch(e) {}
    return res.status(500).json({ error: err.message });
  }
};
