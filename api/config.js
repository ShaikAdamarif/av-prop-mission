// GET /api/config — exposes the PUBLIC Supabase keys to the browser so it
// can subscribe to Realtime directly. The service-role key never leaves the server.
module.exports = (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=60');
  res.status(200).json({
    supabaseUrl: process.env.SUPABASE_URL || '',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || ''
  });
};
