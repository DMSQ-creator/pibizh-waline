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
      host: process.env.POSTGRES_HOST,
      port: process.env.POSTGRES_PORT,
      user: process.env.POSTGRES_USER,
      db: process.env.POSTGRES_DATABASE,
      ssl: process.env.POSTGRES_SSL,
      non_pooling_url_host: process.env.POSTGRES_URL_NON_POOLING ? new URL(process.env.POSTGRES_URL_NON_POOLING).hostname : 'N/A',
    });
  }
  return handler(req, res);
};
