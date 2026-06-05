// Map Vercel Neon Postgres env vars BEFORE requiring Waline
// (ThinkJS reads env vars at require time, not at call time)
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

// NOW require Waline - it will see the mapped env vars
const Waline = require('@waline/vercel');

module.exports = Waline();
