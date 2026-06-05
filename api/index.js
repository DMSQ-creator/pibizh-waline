// Map Vercel Neon Postgres env vars BEFORE requiring Waline
// Prefer NON_POOLING URL for DDL (table creation) support
const connectionString = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;

if (connectionString && !process.env.POSTGRES_DATABASE) {
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
  if (req.url === '/debug') {
    return res.status(200).json({
      using: connectionString === process.env.POSTGRES_URL_NON_POOLING ? 'NON_POOLING' : 'POOLING',
      POSTGRES_DATABASE: process.env.POSTGRES_DATABASE || 'NOT SET',
      POSTGRES_HOST: process.env.POSTGRES_HOST || 'NOT SET',
      POSTGRES_PORT: process.env.POSTGRES_PORT || 'NOT SET',
      POSTGRES_USER: process.env.POSTGRES_USER || 'NOT SET',
    });
  }
  return handler(req, res);
};
