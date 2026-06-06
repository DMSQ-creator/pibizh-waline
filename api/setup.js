module.exports = async (req, res) => {
  const key = req.query.key;
  if (key !== 'fix-admin-2026') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    // Use Waline's own infrastructure
    const Waline = require('@waline/vercel');
    const app = Waline();
    
    // The app is a Next.js-style handler
    // Let me create a proper mock request and response
    
    const body = Buffer.from(JSON.stringify({ email: 'andy@pibizh.com', password: 'pibizh2026' }));
    
    const mockReq = {
      method: 'POST',
      url: '/api/token',
      path: '/api/token',
      headers: {
        'content-type': 'application/json',
        'origin': 'https://pibizh.com',
        'content-length': String(body.length),
      },
      body: body,
      // Node.js IncomingMessage methods
      on: (event, handler) => {
        if (event === 'data') handler(body);
        if (event === 'end') handler();
        return mockReq;
      },
      pipe: (dest) => { dest.write(body); dest.end(); return dest; },
    };
    
    let responseData = '';
    const mockRes = {
      statusCode: 200,
      headers: {},
      status: (code) => { mockRes.statusCode = code; return mockRes; },
      json: (data) => { responseData = JSON.stringify(data); return mockRes; },
      setHeader: (k, v) => { mockRes.headers[k] = v; return mockRes; },
      end: (data) => { if (data) responseData += data; return mockRes; },
      write: (data) => { responseData += data; return mockRes; },
      writeHead: (code, headers) => { mockRes.statusCode = code; Object.assign(mockRes.headers, headers || {}); return mockRes; },
      getHeader: (k) => mockRes.headers[k],
    };
    
    await app(mockReq, mockRes);
    
    return res.json({
      statusCode: mockRes.statusCode,
      response: responseData.substring(0, 500),
      headers: mockRes.headers
    });
  } catch(e) {
    return res.status(500).json({ error: e.message, stack: e.stack?.substring(0, 800) });
  }
};
