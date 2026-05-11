module.exports = (req, res) => {
  const config = {
    SUPABASE_URL: process.env.SUPABASE_URL || process.env.MAIN_SUPABASE_URL || process.env.MAIN_MAINSUPABASE_URL || '',
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || process.env.MAIN_SUPABASE_ANON_KEY || process.env.MAIN_MAINSUPABASE_ANON_KEY || ''
  };

  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).send(`window.__APP_CONFIG__ = ${JSON.stringify(config)};`);
};
