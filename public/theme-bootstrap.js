(function () {
  function normalizePath(pathname) {
    var name = (pathname || '').split('/').pop() || 'index.html';
    return name === '' ? 'index.html' : name;
  }

  function applyLivelyThemeClasses() {
    var body = document.body;
    if (!body) return;

    var params = new URLSearchParams(window.location.search || '');
    var userAgent = navigator.userAgent || '';
    var pageName = normalizePath(window.location.pathname).toLowerCase();
    var lockedGlassPages = pageName === 'admin.html' || pageName === 'download.html';
    var defaultTheme = 'neon';
    var theme = lockedGlassPages ? 'glass' : (localStorage.getItem('lively-theme') || defaultTheme);
    if (!/^(brutal|glass|neon)$/.test(theme)) theme = defaultTheme;

    var animations = localStorage.getItem('lively-animations') !== 'false';
    var compact = localStorage.getItem('lively-compact-ui') === 'true';
    var isDesktopApp = params.get('desktop') === '1' || /Electron/i.test(userAgent);
    var isNativeApp = params.get('app') === '1' || isDesktopApp ||
      Boolean(window.Capacitor && (
        (typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform()) ||
        (typeof window.Capacitor.getPlatform === 'function' && window.Capacitor.getPlatform() !== 'web')
      )) ||
      /\bwv\b/i.test(userAgent);
    var isMobileShell = isNativeApp || (window.matchMedia && window.matchMedia('(max-width: 760px), (pointer: coarse)').matches);

    body.classList.remove('theme-brutal', 'theme-glass', 'theme-neon', 'animations-reduced', 'ui-compact', 'app-native', 'app-desktop', 'app-mobile-shell');
    body.classList.add('theme-' + theme);
    if (!animations) body.classList.add('animations-reduced');
    if (compact) body.classList.add('ui-compact');
    if (isNativeApp) body.classList.add('app-native');
    if (isDesktopApp) body.classList.add('app-desktop');
    if (isMobileShell) body.classList.add('app-mobile-shell');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyLivelyThemeClasses);
  } else {
    applyLivelyThemeClasses();
  }

  window.LivelyTheme = Object.assign({}, window.LivelyTheme || {}, {
    apply: applyLivelyThemeClasses,
    setTheme: function (theme) {
      localStorage.setItem('lively-theme', theme);
      applyLivelyThemeClasses();
    }
  });
})();
