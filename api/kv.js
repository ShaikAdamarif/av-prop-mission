// GET /api/kv  -> returns all key/value pairs as one JSON object
const { supabase } = require('./_supabase.js');

module.exports = async (req, res) => {
  if (req.method !== 'GET') { res.status(405).json({ error: 'Method not allowed' }); return; }
  try {
    const { data, error } = await supabase.from('kv_store').select('key,value');
    if (error) throw error;
    const out = {};
    for (const r of data || []) out[r.key] = r.value;
    res.status(200).json(out);
  } catch (e) {
    console.error('[kv list]', e);
    res.status(500).json({ error: e.message || 'Internal error' });
  }
};
