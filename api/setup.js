const { Client } = require('pg');
const { PasswordHash } = require('phpass');

module.exports = async (req, res) => {
  const key = req.query.key;
  if (key !== 'fix-admin-2026') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const connectionString = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;
  if (!connectionString) {
    return res.status(500).json({ error: 'No database connection string' });
  }

  const client = new Client({ connectionString, ssl: true });
  
  try {
    await client.connect();

    // Simulate exact Waline login flow
    const email = 'andy@pibizh.com';
    const password = 'pibizh2026';
    
    // Step 1: select user by email (lowercase as per PG adapter)
    const { rows: users } = await client.query('SELECT * FROM wl_users WHERE email = $1', [email]);
    
    if (users.length === 0) {
      await client.end();
      return res.json({ step: 'select', error: 'User not found' });
    }
    
    const user = users[0];
    
    // Step 2: map keys (as per postgresql.js mapKeys)
    const mappedUser = { ...user };
    if (user.createdat) mappedUser.createdAt = user.createdat;
    if (user.updatedat) mappedUser.updatedAt = user.updatedat;
    
    // Step 3: check type
    const isVerifyUser = /^verify:/iu.test(mappedUser.type);
    const isBannedUser = mappedUser.type === 'banned';
    
    // Step 4: check password
    const hasher = new PasswordHash();
    const checkResult = hasher.checkPassword(password, mappedUser.password);
    
    // Step 5: Try a completely fresh registration to see what happens
    // Delete existing user and re-register
    
    await client.end();

    return res.status(200).json({
      debug: 'login_simulation',
      userFound: true,
      userId: user.id,
      email: user.email,
      type: user.type,
      isVerifyUser,
      isBannedUser,
      checkPassword: checkResult,
      loginWouldSucceed: !isVerifyUser && !isBannedUser && checkResult,
      passwordPrefix: user.password.substring(0, 10)
    });
  } catch (err) {
    try { await client.end(); } catch(e) {}
    return res.status(500).json({ error: err.message });
  }
};
