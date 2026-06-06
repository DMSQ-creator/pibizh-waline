module.exports = async (req, res) => {
  const key = req.query.key;
  if (key !== 'fix-admin-2026') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    // Try to access Waline's internal ORM
    const Waline = require('@waline/vercel');
    const app = Waline();
    
    // Create a fake context to access the model
    // Actually, let me just make an HTTP request to the token endpoint from within Vercel
    // using the internal URL
    
    const body = JSON.stringify({ email: 'andy@pibizh.com', password: 'pibizh2026' });
    
    // Use Vercel's internal fetch
    const resp = await fetch('http://localhost:3000/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://pibizh.com',
      },
      body
    });
    
    const data = await resp.text();
    
    return res.json({ 
      statusCode: resp.status,
      response: data.substring(0, 500),
      headers: Object.fromEntries(resp.headers.entries())
    });
  } catch(e) {
    return res.status(500).json({ error: e.message, stack: e.stack?.substring(0, 500) });
  }
};
