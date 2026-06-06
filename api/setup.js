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

    const { rows: users } = await client.query('SELECT * FROM wl_users WHERE email = $1', ['andy@pibizh.com']);
    
    if (users.length === 0) {
      await client.end();
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];
    
    // Simulate what Waline's token.js does
    const hasher = new PasswordHash();
    const checkResult = hasher.checkPassword('pibizh2026', user.password);
    
    // Also check if the type field is correct
    const isVerifyUser = /^verify:/iu.test(user.type);
    const isBannedUser = user.type === 'banned';

    await client.end();

    return res.status(200).json({
      userId: user.id,
      email: user.email,
      type: user.type,
      displayName: user.display_name,
      passwordHash: user.password.substring(0, 20) + '...',
      checkPasswordResult: checkResult,
      isVerifyUser: isVerifyUser,
      isBannedUser: isBannedUser,
      loginWouldSucceed: !isVerifyUser && !isBannedUser && checkResult,
      allColumns: Object.keys(user)
    });
  } catch (err) {
    try { await client.end(); } catch(e) {}
    return res.status(500).json({ error: err.message });
  }
};
