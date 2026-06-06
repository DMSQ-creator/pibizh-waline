const { Client } = require('pg');
const { PasswordHash } = require('phpass');

module.exports = async (req, res) => {
  const key = req.query.key;
  if (key !== 'fix-admin-2026') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const connectionString = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;
  if (!connectionString) {
    return res.status(500).json({ error: 'No database connection string' });
  }

  const client = new Client({ connectionString, ssl: true });
  
  try {
    await client.connect();

    const { rows: users } = await client.query('SELECT * FROM wl_users');
    
    const hasher = new PasswordHash();
    const hashedPassword = hasher.hashPassword('pibizh2026');
    
    const updateResult = await client.query(
      `UPDATE wl_users SET type = 'administrator', password = $1 WHERE email = 'andy@pibizh.com' RETURNING "objectId", email, type, "display_name"`,
      [hashedPassword]
    );

    await client.end();

    return res.status(200).json({
      allUsers: users.map(u => ({ 
        objectId: u.objectId, 
        email: u.email, 
        type: u.type, 
        display_name: u.display_name
      })),
      updated: updateResult.rows,
      passwordReset: updateResult.rowCount > 0
    });
  } catch (err) {
    try { await client.end(); } catch(e) {}
    return res.status(500).json({ error: err.message });
  }
};
