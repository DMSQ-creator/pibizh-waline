const { Client } = require('pg');
const { PasswordHash } = require('phpass');
const jwt = require('jsonwebtoken');

module.exports = async (req, res) => {
  const key = req.query.key;
  if (key !== 'fix-admin-2026') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const connectionString = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;
  const client = new Client({ connectionString, ssl: true });
  
  try {
    await client.connect();

    // Simulate EXACTLY what Waline token.js does:
    // 1. this.modelInstance.select({ email })
    // PostgreSQL adapter lowercases keys: { email } → { email }
    // Then parseWhere: email stays email
    // Then query: SELECT * FROM wl_users WHERE email = 'andy@pibizh.com'
    
    const { rows: users } = await client.query("SELECT * FROM wl_users WHERE email = 'andy@pibizh.com'");
    
    if (users.length === 0) {
      await client.end();
      return res.json({ step: 'select', error: 'No user found - this is why login fails!' });
    }
    
    // 2. mapKeys from postgresql.js
    const mappedUsers = users.map(u => {
      const item = { ...u };
      if (u.createdat) item.createdAt = u.createdat;
      if (u.updatedat) item.updatedAt = u.updatedat;
      return item;
    });
    
    const user = mappedUsers[0];
    
    // 3. Check type
    const isVerifyUser = /^verify:/iu.test(user.type);
    const isBannedUser = user.type === 'banned';
    
    // 4. checkPassword
    const hasher = new PasswordHash();
    const checkResult = hasher.checkPassword('pibizh2026', user.password);
    
    // 5. JWT signing
    const jwtKey = process.env.JWT_TOKEN || process.env.POSTGRES_PASSWORD;
    let jwtToken = null;
    try {
      jwtToken = jwt.sign(String(user.id), jwtKey);
    } catch(e) {
      jwtToken = 'ERROR: ' + e.message;
    }
    
    await client.end();
    
    return res.json({
      step: 'complete_simulation',
      userFound: true,
      userId: user.id,
      email: user.email,
      type: user.type,
      isVerifyUser,
      isBannedUser,
      checkPassword: checkResult,
      wouldSucceed: !isVerifyUser && !isBannedUser && checkResult,
      jwtToken: typeof jwtToken === 'string' && jwtToken.startsWith('ey') ? 'OK (' + jwtToken.substring(0, 20) + '...)' : jwtToken,
      jwtKeySource: process.env.JWT_TOKEN ? 'JWT_TOKEN' : 'POSTGRES_PASSWORD',
      allUserKeys: Object.keys(user)
    });
  } catch (err) {
    try { await client.end(); } catch(e) {}
    return res.status(500).json({ error: err.message });
  }
};
