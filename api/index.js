const connectionString = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;

if (connectionString) {
  try {
    const url = new URL(connectionString);
    process.env.POSTGRES_HOST = url.hostname;
    process.env.POSTGRES_PORT = url.port || '5432';
    process.env.POSTGRES_USER = url.username;
    process.env.POSTGRES_PASSWORD = decodeURIComponent(url.password);
    process.env.POSTGRES_DATABASE = url.pathname.slice(1);
    process.env.POSTGRES_SSL = 'true';
  } catch(e) {
    console.error('Failed to parse connection string:', e.message);
  }
}

const Waline = require('@waline/vercel');
const handler = Waline();

module.exports = async (req, res) => {
  if (req.url === '/fix') {
    const { Pool } = require('pg');
    const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
    try {
      // Check and fix all comments
      const check = await pool.query('SELECT id, nick, status FROM wl_comment');
      await pool.query("UPDATE wl_comment SET status = 'approved'");
      const result = await pool.query('SELECT id, nick, status FROM wl_comment');
      return res.status(200).json({ before: check.rows, after: result.rows });
    } catch(e) {
      return res.status(500).json({ error: e.message });
    } finally {
      await pool.end();
    }
  }
  return handler(req, res);
};
