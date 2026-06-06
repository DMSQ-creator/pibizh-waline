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

    // Get current user and their hash
    const { rows: users } = await client.query('SELECT * FROM wl_users WHERE email = $1', ['andy@pibizh.com']);
    
    if (users.length === 0) {
      await client.end();
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];
    const oldHash = user.password;
    
    // Generate a new hash on this server
    const hasher = new PasswordHash();
    const newHash = hasher.hashPassword('pibizh2026');
    
    // Verify the NEW hash
    const hasher2 = new PasswordHash();
    const verifyNew = hasher2.checkPassword('pibizh2026', newHash);
    
    // Verify the OLD hash
    const hasher3 = new PasswordHash();
    let verifyOld = false;
    try {
      verifyOld = hasher3.checkPassword('pibizh2026', oldHash);
    } catch(e) {
      verifyOld = 'ERROR: ' + e.message;
    }
    
    // Update password with fresh hash
    await client.query('UPDATE wl_users SET password = $1, type = $2 WHERE email = $3', [newHash, 'administrator', 'andy@pibizh.com']);

    await client.end();

    return res.status(200).json({
      oldHash: oldHash,
      newHash: newHash,
      verifyOld: verifyOld,
      verifyNew: verifyNew,
      userType: user.type,
      updated: true
    });
  } catch (err) {
    try { await client.end(); } catch(e) {}
    return res.status(500).json({ error: err.message });
  }
};
