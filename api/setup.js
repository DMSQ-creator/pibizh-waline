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

    // Step 1: Get user from DB
    const { rows } = await client.query('SELECT * FROM wl_users WHERE email = $1', ['andy@pibizh.com']);
    
    if (rows.length === 0) {
      await client.end();
      return res.json({ error: 'User not found' });
    }

    const user = rows[0];
    
    // Step 2: Check password with PHPass
    const hasher = new PasswordHash();
    const checkPw = hasher.checkPassword('pibizh2026', user.password);
    
    // Step 3: Try JWT signing (simulating what Waline does)
    let jwtResult = 'not_tested';
    try {
      const jwtKey = process.env.JWT_KEY;
      if (!jwtKey) {
        jwtResult = 'ERROR: JWT_KEY not set';
      } else {
        const token = jwt.sign(String(user.id), jwtKey);
        jwtResult = 'OK, token: ' + token.substring(0, 30) + '...';
      }
    } catch(e) {
      jwtResult = 'ERROR: ' + e.message;
    }
    
    // Step 4: Check all the conditions from token.js
    const isVerifyUser = /^verify:/iu.test(user.type);
    const isBannedUser = user.type === 'banned';
    
    // Step 5: What does the Waline login ACTUALLY see?
    // The issue might be that Waline's ORM query returns different column names
    // Let me check what Waline's select returns
    
    await client.end();
    
    return res.json({
      dbUser: {
        id: user.id,
        email: user.email,
        type: user.type,
        display_name: user.display_name,
        createdat: user.createdat,
        passwordPrefix: user.password.substring(0, 15)
      },
      passwordCheck: checkPw,
      isVerifyUser,
      isBannedUser,
      wouldPassLogin: !isVerifyUser && !isBannedUser && checkPw,
      jwtResult,
      jwtKeySet: !!process.env.JWT_KEY,
      jwtKeyValue: process.env.JWT_KEY || 'NOT SET'
    });
  } catch (err) {
    try { await client.end(); } catch(e) {}
    return res.status(500).json({ error: err.message });
  }
};
