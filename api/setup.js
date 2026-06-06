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

    // First get column names
    const { rows: cols } = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'wl_users'");
    
    // Get all users
    const { rows: users } = await client.query('SELECT * FROM wl_users');
    
    // Hash password with PHPass (same as Waline)
    const hasher = new PasswordHash();
    const hashedPassword = hasher.hashPassword('pibizh2026');
    
    // Update the user - use * to return all columns
    const updateResult = await client.query(
      `UPDATE wl_users SET type = 'administrator', password = $1 WHERE email = 'andy@pibizh.com' RETURNING *`,
      [hashedPassword]
    );

    await client.end();

    return res.status(200).json({
      columns: cols.map(c => c.column_name),
      allUsers: users.map(u => Object.fromEntries(Object.entries(u).map(([k,v]) => [k, k === 'password' ? '***HASHED***' : v]))),
      updatedCount: updateResult.rowCount,
      updatedEmail: updateResult.rows[0]?.email || null,
      updatedType: updateResult.rows[0]?.type || null,
      passwordReset: updateResult.rowCount > 0
    });
  } catch (err) {
    try { await client.end(); } catch(e) {}
    return res.status(500).json({ error: err.message });
  }
};
