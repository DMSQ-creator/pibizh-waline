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

    // Count users - if 0, first user becomes admin
    const { rows: countRows } = await client.query('SELECT count(*) as cnt FROM wl_users');
    const userCount = parseInt(countRows[0].cnt);

    // Create user with PHPass hash (same as Waline)
    const hasher = new PasswordHash();
    const hash = hasher.hashPassword('pibizh2026');
    
    const result = await client.query(
      `INSERT INTO wl_users (email, password, type, display_name, createdat, updatedat) 
       VALUES ($1, $2, $3, $4, NOW(), NOW()) 
       RETURNING id, email, type, display_name`,
      ['andy@pibizh.com', hash, userCount === 0 ? 'administrator' : 'guest', 'Andy']
    );

    // Verify the password
    const hasher2 = new PasswordHash();
    const verify = hasher2.checkPassword('pibizh2026', result.rows[0].password || hash);
    
    await client.end();
    return res.json({ 
      success: true, 
      user: result.rows[0],
      passwordVerify: verify,
      wasFirstUser: userCount === 0
    });
  } catch (err) {
    try { await client.end(); } catch(e) {}
    return res.status(500).json({ error: err.message });
  }
};
