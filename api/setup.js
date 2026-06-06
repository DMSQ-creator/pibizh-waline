const { Client } = require('pg');

module.exports = async (req, res) => {
  const key = req.query.key;
  if (key !== 'fix-admin-2026') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const action = req.query.action || 'info';
  const connectionString = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;
  const client = new Client({ connectionString, ssl: true });
  
  try {
    await client.connect();

    if (action === 'nuke') {
      // Delete ALL users so we can re-register as first user (→ admin)
      await client.query('DELETE FROM wl_users');
      const { rows } = await client.query('SELECT count(*) as cnt FROM wl_users');
      await client.end();
      return res.json({ action: 'nuke', remainingUsers: rows[0].cnt });
    }
    
    if (action === 'register') {
      // Use Waline's own registration endpoint to create the admin user
      // First delete existing
      await client.query("DELETE FROM wl_users WHERE email = 'andy@pibizh.com'");
      await client.end();
      
      // Now call Waline's own register API
      const fetch = (...args) => import('node-fetch').then(m => m.default(...args));
      const regResp = await fetch('https://pibizh-waline-dmsqcreators-projects.vercel.app/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Origin': 'https://pibizh.com' },
        body: JSON.stringify({ email: 'andy@pibizh.com', password: 'pibizh2026', display_name: 'Andy' })
      });
      const regData = await regResp.json();
      return res.json({ action: 'register', regResult: regData });
    }

    // Info mode
    const { rows: users } = await client.query('SELECT id, email, type, display_name, createdat FROM wl_users');
    await client.end();
    return res.json({ action: 'info', users });
  } catch (err) {
    try { await client.end(); } catch(e) {}
    return res.status(500).json({ error: err.message });
  }
};
