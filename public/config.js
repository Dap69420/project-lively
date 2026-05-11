(function () {
  var cfg = window.__APP_CONFIG__;
  if (cfg && (cfg.SUPABASE_URL || cfg.SUPABASE_ANON_KEY)) {
    return;
  }

  fetch('/api/config', { cache: 'no-store' })
    .then(function (response) { return response.text(); })
    .then(function (script) {
      if (script) {
        window.eval(script);
        if (window.supabaseClient === undefined && window.supabase && window.__APP_CONFIG__) {
          var appConfig = window.__APP_CONFIG__ || {};
          var supabaseUrl = appConfig.SUPABASE_URL;
          var supabaseAnonKey = appConfig.SUPABASE_ANON_KEY;
          window.supabaseClient = window.supabase && supabaseUrl && supabaseAnonKey ? window.supabase.createClient(supabaseUrl, supabaseAnonKey) : null;
        }
      }
    })
    .catch(function () {
      window.__APP_CONFIG__ = window.__APP_CONFIG__ || { SUPABASE_URL: '', SUPABASE_ANON_KEY: '' };
    });
})();
