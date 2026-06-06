const { PasswordHash } = require('phpass');

module.exports = async (req, res) => {
  const key = req.query.key;
  if (key !== 'fix-admin-2026') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    // Use Waline's own infrastructure to do a login test
    const Waline = require('@waline/vercel');
    const handler = Waline();
    
    // Create a mock request to /api/token
    const mockReq = {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'origin': 'https://pibizh.com',
      },
      body: JSON.stringify({ email: 'andy@pibizh.com', password: 'pibizh2026' }),
    };
    
    // Try to call the handler directly
    let responseBody = '';
    let statusCode = 200;
    const mockRes = {
      status: (code) => { statusCode = code; return mockRes; },
      json: (data) => { responseBody = JSON.stringify(data); return mockRes; },
      setHeader: () => mockRes,
      end: (data) => { if (data) responseBody = data; return mockRes; },
    };
    
    await handler(mockReq, mockRes);
    
    return res.json({ 
      statusCode,
      loginResponse: JSON.parse(responseBody || '{}'),
      directCheck: new PasswordHash().checkPassword('pibizh2026', '$2a$08$sae7U6efQrUnf6YQKFIHZuGLSL8ZoKFMcy8D4MRgCfz9eoO0RHUyG')
    });
  } catch (err) {
    return res.status(500).json({ error: err.message, stack: err.stack?.substring(0, 500) });
  }
};
