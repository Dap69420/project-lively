// Bypass Navigator LockManager to prevent Supabase immediate lock failure in multiple iframes
if (window.navigator && window.navigator.locks) {
  window.navigator.locks.request = async function(name, options, callback) {
    const cb = typeof options === 'function' ? options : callback;
    return await cb({ name });
  };
}

const appConfig = window.__APP_CONFIG__ || {};
const supabaseUrl = appConfig.SUPABASE_URL;
const supabaseAnonKey = appConfig.SUPABASE_ANON_KEY;
const supabaseClient = window.supabase && supabaseUrl && supabaseAnonKey ? window.supabase.createClient(supabaseUrl, supabaseAnonKey) : null;

if (!supabaseClient) {
  console.warn('Supabase client was not created. Check /config.js and environment variables.');
}

window.supabaseClient = supabaseClient;