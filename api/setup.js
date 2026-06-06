module.exports = async (req, res) => {
  const key = req.query.key;
  if (key !== 'fix-admin-2026') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  // Check what index.js would set for POSTGRES_PASSWORD
  const connectionString = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;
  let parsedPassword = '(no conn string)';
  let rawPassword = process.env.POSTGRES_PASSWORD || '(not set)';
  
  if (connectionString) {
    try {
      const url = new URL(connectionString);
      const rawUrlPassword = url.password;
      const hasPercent = rawUrlPassword.split("%").length > 1;
      const unescapedPassword = hasPercent ? unescape(rawUrlPassword) : rawUrlPassword;
      parsedPassword = `raw: ${rawUrlPassword.substring(0,10)}... | hasPercent: ${hasPercent} | unescaped: ${unescapedPassword.substring(0,10)}...`;
    } catch(e) {
      parsedPassword = 'ERROR: ' + e.message;
    }
  }

  // Check what Waline's config sees
  const { POSTGRES_PASSWORD: envPw, PG_PASSWORD: pgPw } = process.env;
  
  return res.json({
    connectionString: connectionString ? connectionString.substring(0, 50) + '...' : '(none)',
    envPostgresPassword: rawPassword.substring(0, 15) + '...',
    pgPassword: (pgPw || '(not set)').substring(0, 15) + '...',
    parsedInfo: parsedPassword,
    jwtToken: process.env.JWT_TOKEN ? 'SET (' + process.env.JWT_TOKEN.substring(0, 10) + '...)' : 'NOT SET'
  });
};
