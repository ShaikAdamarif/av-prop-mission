const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

// Use service role if available, otherwise fall back to anon key
const SUPABASE_KEY =
  SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.warn(
    '[supabase] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'
  );
}

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },

    // Disable realtime completely (fixes Render Node 20 WebSocket error)
    realtime: {
      enabled: false,
    },
  }
);

module.exports = { supabase };
