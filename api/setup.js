module.exports = async (req, res) => {
  const key = req.query.key;
  if (key !== 'fix-admin-2026') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  // Check all Waline-related environment variables
  const env = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (/POSTGRES|PG_|JWT|SITE_|SECURE|SMTP|WALINE/i.test(k)) {
      env[k] = v ? v.substring(0, 20) + '...' : '(empty)';
    }
  }
  
  // Check if JWT_KEY is set
  const hasJwt = !!process.env.JWT_KEY || !!process.env.JWT_TOKEN;
  
  return res.json({ env, hasJwtKey: hasJwt, jwtKey: process.env.JWT_KEY ? 'SET' : 'NOT SET', jwtToken: process.env.JWT_TOKEN ? 'SET' : 'NOT SET' });
};
