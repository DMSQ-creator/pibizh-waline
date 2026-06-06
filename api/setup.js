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

    // List all tables
    const { rows: tables } = await client.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public'");
    
    let result = { tables: tables.map(t => t.tablename), users: [], updated: null };
    
    // Try each possible user table name
    for (const table of ['Users', 'users', 'user', 'waline_users']) {
      try {
        const { rows } = await client.query(`SELECT * FROM "${table}" LIMIT 10`);
        result.users = rows;
        result.userTable = table;
        
        if (rows.length > 0) {
          // Fix admin user
          const PHPass = require('phpass');
          const hasher = new PHPass();
          const hashedPassword = hasher.hashPassword('pibizh2026');
          
          const updateResult = await client.query(
            `UPDATE "${table}" SET type = 'administrator', password = $1 WHERE email = 'andy@pibizh.com' RETURNING "objectId", email, type, "display_name"`,
            [hashedPassword]
          );
          result.updated = updateResult.rows;
          result.passwordReset = updateResult.rowCount > 0;
        }
        break;
      } catch(e) {
        // Table doesn't exist, try next
      }
    }

    await client.end();
    return res.status(200).json(result);
  } catch (err) {
    try { await client.end(); } catch(e) {}
    return res.status(500).json({ error: err.message });
  }
};
