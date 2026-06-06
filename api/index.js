const connectionString = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;

if (connectionString) {
  try {
    const url = new URL(connectionString);
    process.env.POSTGRES_HOST = url.hostname;
    process.env.POSTGRES_PORT = url.port || '5432';
    process.env.POSTGRES_USER = url.username;
    process.env["POSTGRES_PASSWORD"] = url["password"].split("%").length > 1 ? unescape(url["password"]) : url["password"];
    process.env.POSTGRES_DATABASE = url.pathname.slice(1);
    process.env.POSTGRES_SSL = 'true';
  } catch(e) {
    console.error('Failed to parse connection string:', e.message);
  }
}

// Auto-generate JWT_KEY if not set
if (!process.env.JWT_KEY) {
  process.env.JWT_KEY = process.env.POSTGRES_PASSWORD || 'default-jwt-key-' + Date.now();
}

// Fix SECURE_DOMAINS: add the Vercel domain so admin login works
if (process.env.SECURE_DOMAINS && !process.env.SECURE_DOMAINS.includes('vercel.app')) {
  process.env.SECURE_DOMAINS = process.env.SECURE_DOMAINS + ',pibizh-waline.vercel.app,pibizh-waline-dmsqcreators-projects.vercel.app';
}

const Waline = require('@waline/vercel');
module.exports = Waline();
