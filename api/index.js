const Waline = require('@waline/vercel');

// Map Vercel Neon Postgres env vars to Waline's expected format
if (process.env.POSTGRES_URL && !process.env.POSTGRES_DATABASE) {
  try {
    const url = new URL(process.env.POSTGRES_URL);
    process.env.POSTGRES_HOST = url.hostname;
    process.env.POSTGRES_PORT = url.port || '5432';
    process.env.POSTGRES_USER = url.username;
    process.env.POSTGRES_PASSWORD = decodeURIComponent(url.password);
    process.env.POSTGRES_DATABASE = url.pathname.slice(1);
    // Enable SSL for Neon connections
    process.env.POSTGRES_SSL = 'true';
  } catch(e) {
    console.error('Failed to parse POSTGRES_URL:', e.message);
  }
}

module.exports = Waline();
