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
  if (req.url === '/setup') {
    const { Pool } = require('pg');
    const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
    try {
      // Drop old tables with wrong naming
      await pool.query('DROP TABLE IF EXISTS wl_comment CASCADE');
      await pool.query('DROP TABLE IF EXISTS wl_users CASCADE');
      
      // Recreate with ThinkJS-style column names (no underscores)
      await pool.query(`
        CREATE TABLE wl_comment (
          id SERIAL PRIMARY KEY,
          userid INTEGER,
          nick VARCHAR(255),
          mail VARCHAR(255),
          link VARCHAR(255),
          url VARCHAR(1024),
          href VARCHAR(1024),
          comment TEXT,
          commenttype VARCHAR(64),
          insertedat TIMESTAMPTZ,
          createdat TIMESTAMPTZ,
          updatedat TIMESTAMPTZ,
          ip VARCHAR(128),
          ua VARCHAR(1024),
          status VARCHAR(64),
          "like" INTEGER,
          dislike INTEGER,
          pid INTEGER,
          rid INTEGER,
          sticky BOOLEAN,
          avatarurl VARCHAR(1024),
          isspam BOOLEAN,
          reaction0 INTEGER,
          reaction1 INTEGER,
          reaction2 INTEGER,
          reaction3 INTEGER,
          reaction4 INTEGER,
          reaction5 INTEGER,
          reaction6 INTEGER,
          reaction7 INTEGER,
          reaction8 INTEGER
        )
      `);
      await pool.query(`
        CREATE TABLE wl_users (
          id SERIAL PRIMARY KEY,
          displayname VARCHAR(255),
          email VARCHAR(255),
          password VARCHAR(1024),
          type VARCHAR(64),
          avatarurl VARCHAR(1024),
          url VARCHAR(1024),
          createdat TIMESTAMPTZ,
          updatedat TIMESTAMPTZ
        )
      `);
      await pool.query('CREATE INDEX idx_wl_comment_url ON wl_comment(url)');
      await pool.query('CREATE INDEX idx_wl_comment_pid ON wl_comment(pid)');
      return res.status(200).json({ ok: true, message: 'Tables recreated with correct naming!' });
    } catch(e) {
      return res.status(500).json({ error: e.message });
    } finally {
      await pool.end();
    }
  }
  return handler(req, res);
};
