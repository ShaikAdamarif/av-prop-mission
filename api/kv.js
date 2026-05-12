const express = require('express');
const router = express.Router();
const { supabase } = require('./_supabase');

router.get('/', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase not configured' });
    }

    const { data, error } = await supabase
      .from('kv_store')
      .select('key, value');

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const result = {};
    for (const row of data) {
      result[row.key] = row.value;
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
