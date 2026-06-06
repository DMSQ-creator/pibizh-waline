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

    // Check all users
    const { rows: users } = await client.query('SELECT * FROM wl_users');
    
    // Try to simulate exactly what Waline does in token.js
    // But also try to actually use Waline's built-in method
    let walineLoginResult = 'not_tested';
    
    try {
      // Try using the Waline module directly
      const Waline = require('@waline/vercel');
      const app = Waline();
      
      // Check if we can access the internal model
      walineLoginResult = 'Waline loaded successfully';
    } catch(e) {
      walineLoginResult = 'Error: ' + e.message;
    }
    
    const results = users.map(u => {
      const hasher = new PasswordHash();
      let verify = false;
      try { verify = hasher.checkPassword('pibizh2026', u.password); } catch(e) { verify = 'ERROR: ' + e.message; }
      return {
        id: u.id,
        email: u.email,
        type: u.type,
        display_name: u.display_name,
        passwordHash: u.password,
        verifyPibizh2026: verify,
        isVerifyUser: /^verify:/iu.test(u.type),
        isBannedUser: u.type === 'banned',
        createdAt: u.createdat
      };
    });
    
    await client.end();
    return res.json({ users: results, walineStatus: walineLoginResult });
  } catch (err) {
    try { await client.end(); } catch(e) {}
    return res.status(500).json({ error: err.message });
  }
};
