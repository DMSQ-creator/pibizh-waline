module.exports = async (req, res) => {
  const key = req.query.key;
  if (key !== 'fix-admin-2026') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    // Set JWT_TOKEN since Waline reads it
    if (!process.env.JWT_TOKEN) {
      process.env.JWT_TOKEN = process.env.POSTGRES_PASSWORD || 'fallback-jwt-key';
    }
    
    const Waline = require('@waline/vercel');
    const app = Waline();
    
    // Now make an internal request to /api/token
    // But this time capture the actual error
    
    // Alternative: use the thinkjs model directly
    const think = require('thinkjs');
    
    return res.json({ 
      msg: 'checking thinkjs',
      jwtToken: process.env.JWT_TOKEN ? 'SET' : 'NOT SET'
    });
  } catch(e) {
    return res.status(500).json({ error: e.message, stack: e.stack?.substring(0, 500) });
  }
};
