// Debug: check what env vars are available
const hasUrl = !!process.env.POSTGRES_URL;
const hasDb = !!process.env.POSTGRES_DATABASE;
const hasHost = !!process.env.POSTGRES_HOST;

// Map Vercel Neon Postgres env vars BEFORE requiring Waline
if (process.env.POSTGRES_URL && !process.env.POSTGRES_DATABASE) {
  try {
    const url = new URL(process.env.POSTGRES_URL);
    process.env.POSTGRES_HOST = url.hostname;
    process.env.POSTGRES_PORT = url.port || '5432';
    process.env.POSTGRES_USER = url.username;
    process.env.POSTGRES_PASSWORD = decodeURIComponent(url.password);
    process.env.POSTGRES_DATABASE = url.pathname.slice(1);
    process.env.POSTGRES_SSL = 'true';
  } catch(e) {
    console.error('Failed to parse POSTGRES_URL:', e.message);
  }
}

const Waline = require('@waline/vercel');
const handler = Waline();

// Add debug endpoint
const originalHandler = handler;
module.exports = async (req, res) => {
  if (req.url === '/debug') {
    return res.status(200).json({
      POSTGRES_URL: process.env.POSTGRES_URL ? 'SET' : 'NOT SET',
      POSTGRES_DATABASE: process.env.POSTGRES_DATABASE || 'NOT SET',
      POSTGRES_HOST: process.env.POSTGRES_HOST || 'NOT SET',
      POSTGRES_USER: process.env.POSTGRES_USER || 'NOT SET',
      POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD ? 'SET' : 'NOT SET',
      POSTGRES_PORT: process.env.POSTGRES_PORT || 'NOT SET',
      PG_DB: process.env.PG_DB || 'NOT SET',
      PG_HOST: process.env.PG_HOST || 'NOT SET',
    });
  }
  return originalHandler(req, res);
};
