const connectionString = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;

if (connectionString) {
  try {
    const url = new URL(connectionString);
    process.env.POSTGRES_HOST = url.hostname;
    process.env.POSTGRES_PORT = url.port || '5432';
    process.env.POSTGRES_USER = url.username;
    process.env.POSTGRES_PASSWORD = decode…rd);
    process.env.POSTGRES_DATABASE = url.pathname.slice(1);
    process.env.POSTGRES_SSL = 'true';
  } catch(e) {
    console.error('Failed to parse connection string:', e.message);
  }
}

const Waline = require('@waline/vercel');
const handler = Waline();

module.exports = async (req, res) => {
  if (req.url === '/setup-admin') {
    const { Pool } = require('pg');
    const { PasswordHash } = require('phpass');
    const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
    try {
      const pwdHash = new PasswordHash();
      const password = 'pibizh2026';
      const hashed = pwdHash.hashPassword(password);
      
      await pool.query(`
        INSERT INTO wl_users (display_name, email, password, type, createdat, updatedat)
        VALUES ($1, $2, $3, $4, NOW(), NOW())
        ON CONFLICT DO NOTHING
      `, ['Andy', 'andy@pibizh.com', hashed, 'administrator']);
      
      const check = await pool.query("SELECT id, display_name, email, type FROM wl_users WHERE email = 'andy@pibizh.com'");
      return res.status(200).json({ ok: true, user: check.rows[0], password: password });
    } catch(e) {
      return res.status(500).json({ error: e.message });
    } finally {
      await pool.end();
    }
  }
  return handler(req, res);
};
