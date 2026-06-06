const { Client } = require('pg');

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

    // Get all users from wl_users
    const { rows: users } = await client.query('SELECT * FROM wl_users');
    
    // Fix the admin user with correct phpass password hash
    const PHPass = require('phpass');
    const hasher = new PHPass();
    const hashedPassword = hasher.hashPassword('pibizh2026');
    
    // Update user type and password for andy@pibizh.com
    const updateResult = await client.query(
      `UPDATE wl_users SET type = 'administrator', password = $1 WHERE email = 'andy@pibizh.com' RETURNING "objectId", email, type, "display_name", "createdAt"`,
      [hashedPassword]
    );

    await client.end();

    return res.status(200).json({
      allUsers: users.map(u => ({ 
        objectId: u.objectId, 
        email: u.email, 
        type: u.type, 
        display_name: u.display_name,
        createdAt: u.createdAt
      })),
      updated: updateResult.rows,
      passwordReset: updateResult.rowCount > 0
    });
  } catch (err) {
    try { await client.end(); } catch(e) {}
    return res.status(500).json({ error: err.message });
  }
};
