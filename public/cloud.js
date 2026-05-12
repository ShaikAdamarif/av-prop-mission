// Cloud sync shim — Supabase-backed (lifetime storage) with Realtime live sync.
// Writes go through the Vercel /api/kv/* endpoints (service-role, RLS bypassed).
// Reads + live updates use the public Supabase Realtime channel directly.
//
// All localStorage keys starting with "av_" are shared across every device,
// EXCEPT av_session (per-device login).
const SHARED_PREFIX = 'av_';
const LOCAL_ONLY = new Set(['av_session']);
const isShared = (k) => typeof k === 'string' && k.startsWith(SHARED_PREFIX) && !LOCAL_ONLY.has(k);

const origSet = Storage.prototype.setItem;
const origDel = Storage.prototype.removeItem;
let suppress = false;
let lastSyncAt = null;

function setBadge(state, text) {
  const b = document.getElementById('__cloud_badge');
  if (!b) return;
  b.dataset.state = state;
  b.querySelector('.txt').textContent = text;
}

function debounce(fn, ms) {
  let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}
const pendingPushes = new Map(); // key -> latest value
const flushPushes = debounce(async () => {
  const entries = [...pendingPushes.entries()];
  pendingPushes.clear();
  for (const [key, value] of entries) {
    try {
      await fetch('/api/kv/' + encodeURIComponent(key), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value })
      });
      lastSyncAt = new Date();
    } catch (e) { console.error('[sync] push', key, e); }
  }
}, 150);

Storage.prototype.setItem = function (key, value) {
  origSet.call(this, key, value);
  if (this === localStorage && !suppress && isShared(key)) {
    let parsed; try { parsed = JSON.parse(value); } catch { parsed = value; }
    pendingPushes.set(key, parsed);
    flushPushes();
  }
};

Storage.prototype.removeItem = function (key) {
  origDel.call(this, key);
  if (this === localStorage && !suppress && isShared(key)) {
    fetch('/api/kv/' + encodeURIComponent(key), { method: 'DELETE' })
      .then(() => { lastSyncAt = new Date(); })
      .catch(e => console.error('[sync] del', key, e));
  }
};

async function hydrate() {
  const r = await fetch('/api/kv');
  if (!r.ok) throw new Error('hydrate failed: ' + r.status);
  const data = await r.json();
  suppress = true;
  try {
    const seen = new Set();
    for (const [key, value] of Object.entries(data || {})) {
      if (!isShared(key)) continue;
      seen.add(key);
      try { origSet.call(localStorage, key, JSON.stringify(value)); } catch {}
    }
    // First-device case: push any local shared keys the server doesn't have yet
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!isShared(k) || seen.has(k)) continue;
      const v = localStorage.getItem(k);
      let parsed; try { parsed = JSON.parse(v); } catch { parsed = v; }
      pendingPushes.set(k, parsed);
    }
    if (pendingPushes.size) flushPushes();
  } finally { suppress = false; }
  lastSyncAt = new Date();
  if (typeof window.renderAll === 'function') { try { window.renderAll(); } catch {} }
}

async function loadSupabaseClient() {
  if (window.supabase && window.supabase.createClient) return window.supabase;
  await new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js';
    s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
  });
  return window.supabase;
}

async function subscribeRealtime() {
  let cfg;
  try {
    const r = await fetch('/api/config');
    cfg = await r.json();
  } catch { cfg = null; }
  if (!cfg || !cfg.supabaseUrl || !cfg.supabaseAnonKey) {
    setBadge('off', 'Cloud not configured');
    // Still works: writes/reads via /api/kv. Just no live push from other devices.
    // Fall back to lightweight polling every 5s.
    setInterval(() => { hydrate().catch(() => {}); }, 5000);
    return;
  }
  const sb = await loadSupabaseClient();
  const client = sb.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const channel = client
    .channel('kv_store_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'kv_store' }, (payload) => {
      const row = payload.new || payload.old;
      if (!row || !isShared(row.key)) return;
      suppress = true;
      try {
        if (payload.eventType === 'DELETE') {
          origDel.call(localStorage, row.key);
        } else {
          origSet.call(localStorage, row.key, JSON.stringify(row.value));
        }
      } finally { suppress = false; }
      lastSyncAt = new Date();
      window.dispatchEvent(new StorageEvent('storage', { key: row.key }));
      if (typeof window.renderAll === 'function') { try { window.renderAll(); } catch {} }
    })
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') setBadge('on', 'Live sync');
      else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') setBadge('off', 'Reconnecting…');
    });
  window.__cloudChannel = channel;
}

window.cloudSync = async function () {
  setBadge('sync', 'Syncing…');
  try { await hydrate(); setBadge('on', 'Synced ' + new Date().toLocaleTimeString()); }
  catch (e) { console.error(e); setBadge('off', 'Sync failed'); }
};

function mountBadge() {
  if (document.getElementById('__cloud_badge')) return;
  const el = document.createElement('div');
  el.id = '__cloud_badge';
  el.innerHTML = `
    <style>
      #__cloud_badge{position:fixed;right:14px;bottom:14px;z-index:99999;
        font:600 12px/1 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;
        background:#111;color:#fff;border-radius:999px;padding:8px 12px;
        box-shadow:0 6px 20px rgba(0,0,0,.25);display:flex;gap:8px;align-items:center;cursor:pointer;
        user-select:none;opacity:.92}
      #__cloud_badge:hover{opacity:1}
      #__cloud_badge .dot{width:8px;height:8px;border-radius:50%;background:#888}
      #__cloud_badge[data-state="on"] .dot{background:#22c55e;box-shadow:0 0 8px #22c55e}
      #__cloud_badge[data-state="off"] .dot{background:#ef4444}
      #__cloud_badge[data-state="sync"] .dot{background:#f59e0b;animation:cb 1s linear infinite}
      @keyframes cb{50%{opacity:.3}}
    </style>
    <span class="dot"></span><span class="txt">Connecting…</span>
    <span style="opacity:.7;border-left:1px solid #444;padding-left:8px;margin-left:2px">Cloud</span>
  `;
  el.title = 'Click to force re-sync from cloud';
  el.addEventListener('click', () => window.cloudSync());
  document.body.appendChild(el);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountBadge);
} else { mountBadge(); }

window.__cloudReady = (async () => {
  try { await hydrate(); } catch (e) { console.error('[sync] hydrate', e); setBadge('off','Offline'); }
  try { await subscribeRealtime(); } catch (e) { console.error('[sync] realtime', e); }
})();
