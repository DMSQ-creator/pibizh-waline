const { Client } = require('pg');

module.exports = async (req, res) => {
  // Only allow GET with a secret key
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

    // Check current users
    const { rows: users } = await client.query('SELECT "objectId", email, type, "display_name" FROM "Users"');
    
    // Fix the admin user - set type to 'administrator' and reset password
    // Waline uses phpass for password hashing
    const PHPass = require('phpass');
    const hasher = new PHPass();
    const hashedPassword = hasher.hashPassword('pibizh2026');
    
    const result = await client.query(
      `UPDATE "Users" SET type = 'administrator', password = $1 WHERE email = 'andy@pibizh.com' RETURNING "objectId", email, type, "display_name"`,
      [hashedPassword]
    );

    await client.end();

    return res.status(200).json({
      allUsers: users.map(u => ({ id: u.objectId, email: u.email, type: u.type, name: u.display_name })),
      updated: result.rows,
      passwordReset: result.rowCount > 0
    });
  } catch (err) {
    try { await client.end(); } catch(e) {}
    return res.status(500).json({ error: err.message });
  }
};
