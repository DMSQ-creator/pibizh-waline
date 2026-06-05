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
    // Manually create Waline tables
    const { Pool } = require('pg');
    const pool = new Pool({ connectionString });
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS wl_comment (
          id SERIAL PRIMARY KEY,
          user_id INTEGER,
          nick VARCHAR(255),
          mail VARCHAR(255),
          link VARCHAR(255),
          url VARCHAR(1024),
          href VARCHAR(1024),
          comment TEXT,
          comment_type VARCHAR(64),
          inserted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          ip VARCHAR(128),
          ua VARCHAR(1024),
          status VARCHAR(64) DEFAULT 'approved',
          like INTEGER DEFAULT 0,
          dislike INTEGER DEFAULT 0,
          pid INTEGER,
          rid INTEGER,
          sticky BOOLEAN DEFAULT FALSE,
          avatar_url VARCHAR(1024),
          is_spam BOOLEAN DEFAULT FALSE,
          reaction0 INTEGER DEFAULT 0,
          reaction1 INTEGER DEFAULT 0,
          reaction2 INTEGER DEFAULT 0,
          reaction3 INTEGER DEFAULT 0,
          reaction4 INTEGER DEFAULT 0,
          reaction5 INTEGER DEFAULT 0,
          reaction6 INTEGER DEFAULT 0,
          reaction7 INTEGER DEFAULT 0,
          reaction8 INTEGER DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS wl_users (
          id SERIAL PRIMARY KEY,
          display_name VARCHAR(255),
          email VARCHAR(255),
          password VARCHAR(1024),
          type VARCHAR(64) DEFAULT 'normal',
          avatar_url VARCHAR(1024),
          url VARCHAR(1024),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_wl_comment_url ON wl_comment(url);
        CREATE INDEX IF NOT EXISTS idx_wl_comment_pid ON wl_comment(pid);
      `);
      return res.status(200).json({ ok: true, message: 'Tables created!' });
    } catch(e) {
      return res.status(500).json({ error: e.message });
    } finally {
      await pool.end();
    }
  }
  return handler(req, res);
};
