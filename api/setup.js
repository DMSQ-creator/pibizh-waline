module.exports = async (req, res) => {
  const key = req.query.key;
  if (key !== 'fix-admin-2026') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  return res.json({
    SECURE_DOMAINS: process.env.SECURE_DOMAINS || '(not set)',
    SITE_URL: process.env.SITE_URL || '(not set)',
  });
};
