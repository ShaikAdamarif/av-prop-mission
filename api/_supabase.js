// Shared Supabase admin client used by all serverless API routes.
// Uses the SERVICE ROLE key — server-only, never exposed to the browser.
const { createClient } = require('@supabase/supabase-js');

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.warn('[supabase] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars');
}

const supabase = createClient(url || 'http://localhost', serviceKey || 'missing', {
  auth: { persistSession: false, autoRefreshToken: false }
});

module.exports = { supabase };
