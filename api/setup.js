const { Client } = require('pg');

module.exports = async (req, res) => {
  // Accept key from query or body
  const key = req.body?.secret || req.query?.s;
  if (key !== 'fix-admin-2026') {
    return res.status(403).json({ error: 'Forbidden', got: typeof key });
  }

  const connectionString = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;
  const client = new Client({ connectionString, ssl: true });
  
  try {
    await client.connect();
    const { rows: tables } = await client.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public'");
    const counts = {};
    for (const t of tables) {
      try {
        const { rows } = await client.query(`SELECT count(*) as cnt FROM "${t.tablename}"`);
        counts[t.tablename] = parseInt(rows[0].cnt);
      } catch(e) {}
    }
    let comments = [];
    try {
      const { rows } = await client.query('SELECT id, nick, url, path, createdat FROM wl_comment ORDER BY createdat DESC LIMIT 5');
      comments = rows;
    } catch(e) { comments = e.message; }
    
    await client.end();
    return res.json({ tables: counts, recentComments: comments });
  } catch (err) {
    try { await client.end(); } catch(e) {}
    return res.status(500).json({ error: err.message });
  }
};
