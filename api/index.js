const Waline = require('@waline/vercel');

// Map Vercel Neon Postgres env vars to Waline's expected format
if (process.env.POSTGRES_URL && !process.env.PG_HOST) {
  try {
    const url = new URL(process.env.POSTGRES_URL);
    process.env.PG_HOST = url.hostname;
    process.env.PG_PORT = url.port || '5432';
    process.env.PG_USER = url.username;
    process.env.PG_PASSWORD = url.password;
    process.env.PG_DB = url.pathname.slice(1);
  } catch(e) {
    console.error('Failed to parse POSTGRES_URL:', e.message);
  }
}

module.exports = Waline();
