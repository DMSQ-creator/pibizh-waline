const { PasswordHash } = require('phpass');

module.exports = async (req, res) => {
  const rawKey = req.headers['x-auth'] || '';
  const key = Buffer.from(rawKey, 'base64').toString('utf8');
  if (key !== 'fix-admin-2026') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  // Intercept the Waline handler to see what happens during login
  const Waline = require('@waline/vercel');
  const handler = Waline();
  
  // Make a real HTTP request to ourselves to test login
  // But use the internal Vercel routing
  
  // Actually, let me just check what the raw POST body looks like
  // when sent as JSON vs form-encoded
  
  const body = req.body;
  
  // Test password check
  const hasher = new PasswordHash();
  const { Client } = require('pg');
  const client = new Client({ 
    connectionString: process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL, 
    ssl: true 
  });
  
  await client.connect();
  const { rows } = await client.query("SELECT password FROM wl_users WHERE email = 'andy@pibizh.com'");
  await client.end();
  
  if (rows.length === 0) return res.json({ error: 'no user' });
  
  const storedHash = rows[0].password;
  const checkPibizh = hasher.checkPassword('pibizh2026', storedHash);
  
  return res.json({
    storedHashPrefix: storedHash.substring(0, 20),
    checkPibizh2026: checkPibizh,
    env: {
      SECURE_DOMAINS: process.env.SECURE_DOMAINS,
      hasJwtToken: !!process.env.JWT_TOKEN,
      hasJwtKey: !!process.env.JWT_KEY,
      hasPgPassword: !!process.env.POSTGRES_PASSWORD,
    }
  });
};
