// PUT/DELETE /api/kv/[key]
const { supabase } = require('../_supabase.js');

async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  return await new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => { data += c; });
    req.on('end', () => { try { resolve(data ? JSON.parse(data) : {}); } catch (e) { reject(e); } });
    req.on('error', reject);
  });
}

module.exports = async (req, res) => {
  const key = (req.query && req.query.key) || req.url.split('/').pop().split('?')[0];
  if (!key) { res.status(400).json({ error: 'Missing key' }); return; }

  try {
    if (req.method === 'PUT') {
      const body = await readJson(req);
      const value = body && Object.prototype.hasOwnProperty.call(body, 'value') ? body.value : null;
      const { error } = await supabase
        .from('kv_store')
        .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
      if (error) throw error;
      res.status(200).json({ ok: true });
    } else if (req.method === 'DELETE') {
      const { error } = await supabase.from('kv_store').delete().eq('key', key);
      if (error) throw error;
      res.status(200).json({ ok: true });
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (e) {
    console.error('[kv key]', e);
    res.status(500).json({ error: e.message || 'Internal error' });
  }
};
