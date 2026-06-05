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
    // List all POSTGRES_ and PG_ env vars
    const pgVars = {};
    for (const [k, v] of Object.entries(process.env)) {
      if (k.startsWith('POSTGRES_') || k.startsWith('PG_')) {
        pgVars[k] = k.includes('PASSWORD') ? '***' : (k.includes('URL') ? v.substring(0, 50) + '...' : v);
      }
    }
    return res.status(200).json(pgVars);
  }
  return handler(req, res);
};
