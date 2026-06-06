const { Client } = require('pg');

module.exports = async (req, res) => {
  const rawKey = req.query?.s || req.headers['x-auth'] || '';
  const key = Buffer.from(rawKey, 'base64').toString('utf8');
  if (key !== 'fix-admin-2026') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const connectionString = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;
  const client = new Client({ connectionString, ssl: true });
  
  try {
    await client.connect();
    
    // Get column names first
    const { rows: cols } = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'wl_comment'");
    
    // Get all comments
    const { rows: comments } = await client.query('SELECT * FROM wl_comment ORDER BY createdat DESC');
    
    await client.end();
    return res.json({ columns: cols.map(c => c.column_name), comments });
  } catch (err) {
    try { await client.end(); } catch(e) {}
    return res.status(500).json({ error: err.message });
  }
};
