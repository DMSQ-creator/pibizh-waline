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

if (!process.env.JWT_KEY) {
  process.env.JWT_KEY = process.env.POSTGRES_PASSWORD || 'default-jwt-key-' + Date.now();
}

// Fix SECURE_DOMAINS: add the Vercel domain so admin login works
if (process.env.SECURE_DOMAINS && !process.env.SECURE_DOMAINS.includes('vercel.app')) {
  process.env.SECURE_DOMAINS = process.env.SECURE_DOMAINS + ',pibizh-waline.vercel.app,pibizh-waline-dmsqcreators-projects.vercel.app';
}

const Waline = require('@waline/vercel');

// Patch token controller to add debug logging
const origToken = require('@waline/vercel/src/controller/token');
const origPost = origToken.prototype.post;
origToken.prototype.post = async function() {
  try {
    const body = this.post();
    const email = body.email;
    const password = body.password;
    
    console.log('[DEBUG] Login attempt:', email);
    
    const user = await this.modelInstance.select({ email });
    console.log('[DEBUG] User found:', user.length > 0, user.length > 0 ? { type: user[0].type, email: user[0].email } : 'none');
    
    if (user.length > 0) {
      const { PasswordHash } = require('phpass');
      const hasher = new PasswordHash();
      const check = hasher.checkPassword(password, user[0].password);
      console.log('[DEBUG] Password check:', check);
    }
    
    return origPost.call(this);
  } catch(e) {
    console.log('[DEBUG] Error:', e.message);
    return this.fail(e.message);
  }
};

module.exports = Waline();
