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

if (process.env.SECURE_DOMAINS && !process.env.SECURE_DOMAINS.includes('vercel.app')) {
  process.env.SECURE_DOMAINS = process.env.SECURE_DOMAINS + ',pibizh-waline.vercel.app,pibizh-waline-dmsqcreators-projects.vercel.app';
}

const Waline = require('@waline/vercel');

// Patch token controller to return debug info in the error response
const origToken = require('@waline/vercel/src/controller/token');
const origPost = origToken.prototype.post;
origToken.prototype.post = async function() {
  const debugInfo = {};
  try {
    const body = this.post();
    debugInfo.bodyEmail = body.email;
    debugInfo.bodyHasPassword = !!body.password;
    
    const user = await this.modelInstance.select({ email: body.email });
    debugInfo.userCount = user.length;
    
    if (user.length > 0) {
      debugInfo.userType = user[0].type;
      debugInfo.isVerify = /^verify:/iu.test(user[0].type);
      debugInfo.isBanned = user[0].type === 'banned';
      
      try {
        const { PasswordHash } = require('phpass');
        const hasher = new PasswordHash();
        debugInfo.pwCheck = hasher.checkPassword(body.password, user[0].password);
      } catch(e) {
        debugInfo.pwCheckError = e.message;
      }
    }
    
    const result = await origPost.call(this);
    debugInfo.result = JSON.stringify(result).substring(0, 100);
    
    // If login failed, include debug info in the response
    if (this.ctx.body && this.ctx.body.errno === 1000) {
      this.ctx.body.debug = debugInfo;
    }
    
    return result;
  } catch(e) {
    debugInfo.error = e.message;
    return this.fail({ message: e.message, debug: debugInfo });
  }
};

module.exports = Waline();
