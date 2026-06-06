const { Client } = require('pg');

module.exports = async (req, res) => {
  const key = req.query.key;
  if (key !== 'fix-admin-2026') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const connectionString = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;
  const client = new Client({ connectionString, ssl: true });
  
  try {
    await client.connect();

    // List all tables
    const { rows: tables } = await client.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public'");
    
    // Count records in each table
    const counts = {};
    for (const t of tables) {
      try {
        const { rows } = await client.query(`SELECT count(*) as cnt FROM "${t.tablename}"`);
        counts[t.tablename] = parseInt(rows[0].cnt);
      } catch(e) {
        counts[t.tablename] = 'error: ' + e.message;
      }
    }
    
    // Get recent comments
    let comments = [];
    try {
      const { rows } = await client.query('SELECT * FROM wl_comment ORDER BY createdat DESC LIMIT 5');
      comments = rows.map(c => ({ id: c.id, nick: c.nick, url: c.url, path: c.path, content: (c.comment || '').substring(0, 80), createdat: c.createdat }));
    } catch(e) {
      comments = ['error: ' + e.message];
    }

    await client.end();
    return res.json({ tables: counts, recentComments: comments });
  } catch (err) {
    try { await client.end(); } catch(e) {}
    return res.status(500).json({ error: err.message });
  }
};
