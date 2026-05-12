// Local dev server — mirrors the Vercel API routes so `npm start` works the
// same as production. In production, Vercel uses the files under /api/* directly.
const path = require('path');
const express = require('express');
const kvList = require('./api/kv.js');
const kvKey = require('./api/kv/[key].js');
const config = require('./api/config.js');

const PORT = process.env.PORT || 3000;
const app = express();
app.use(express.json({ limit: '20mb' }));

app.get('/api/config', (req, res) => config(req, res));
app.get('/api/kv', (req, res) => kvList(req, res));
app.put('/api/kv/:key', (req, res) => { req.query = { key: req.params.key }; kvKey(req, res); });
app.delete('/api/kv/:key', (req, res) => { req.query = { key: req.params.key }; kvKey(req, res); });

app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => {
  console.log(`AV PROP MISSION (Vercel-compatible) running on http://localhost:${PORT}`);
  if (!process.env.SUPABASE_URL) console.warn('Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY in your environment.');
});
