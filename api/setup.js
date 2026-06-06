const { PasswordHash } = require('phpass');

module.exports = async (req, res) => {
  const key = req.query.key;
  if (key !== 'fix-admin-2026') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    const Waline = require('@waline/vercel');
    const handler = Waline();
    
    // Create a mock request to /api/token
    const chunks = [];
    const mockReq = {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'origin': 'https://pibizh.com',
      },
      url: '/api/token',
    };
    
    // Push body
    mockReq.push = (chunk) => { if (chunk) chunks.push(Buffer.from(chunk)); };
    mockReq.push(JSON.stringify({ email: 'andy@pibizh.com', password: 'pibizh2026' }));
    
    let responseBody = '';
    let statusCode = 200;
    const mockRes = {
      statusCode: 200,
      status: (code) => { mockRes.statusCode = code; return mockRes; },
      json: (data) => { responseBody = JSON.stringify(data); return mockRes; },
      setHeader: () => mockRes,
      end: (data) => { if (data) responseBody = data; return mockRes; },
      write: (data) => { responseBody += data; return mockRes; },
      writeHead: (code) => { mockRes.statusCode = code; return mockRes; },
    };
    
    try {
      await handler(mockReq, mockRes);
    } catch(e) {
      return res.json({ handlerError: e.message, handlerStack: e.stack?.substring(0, 800) });
    }
    
    return res.json({ 
      statusCode: mockRes.statusCode,
      rawResponse: responseBody.substring(0, 500),
      directCheck: new PasswordHash().checkPassword('pibizh2026', '$2a$08$sae7U6efQrUnf6YQKFIHZuGLSL8ZoKFMcy8D4MRgCfz9eoO0RHUyG')
    });
  } catch (err) {
    return res.status(500).json({ error: err.message, stack: err.stack?.substring(0, 500) });
  }
};
