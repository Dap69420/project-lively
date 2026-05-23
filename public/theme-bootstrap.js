(function () {
  function normalizePath(pathname) {
    var name = (pathname || '').split('/').pop() || 'index.html';
    return name === '' ? 'index.html' : name;
  }

  function ensureVektraGlobalNav() {
    if (document.querySelector('.vektra-global-nav')) return;
    if (!document.body) return;

    var links = [
      { href: 'index.html', label: 'Home', icon: 'icon-house' },
      { href: 'workspace.html', label: 'Workspace', icon: 'icon-layout-dashboard' },
      { href: 'profile.html', label: 'Profile', icon: 'icon-user-round' },
      { href: 'download.html', label: 'Downloads', icon: 'icon-download' },
      { href: 'classrooms.html', label: 'Classrooms', icon: 'icon-users' },
      { href: 'admin.html', label: 'Admin', icon: 'icon-shield' },
      { href: 'founders.html', label: 'Founders', icon: 'icon-flask-conical' },
      { href: 'login.html', label: 'Login', icon: 'icon-key-round' }
    ];
    var current = normalizePath(window.location.pathname);
    var nav = document.createElement('nav');
    nav.className = 'vektra-global-nav';
    nav.setAttribute('aria-label', 'Vektra page navigation');
    nav.setAttribute('data-open', 'false');

    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'vektra-global-nav__toggle';
    button.setAttribute('aria-label', 'Open page navigation');
    button.setAttribute('aria-expanded', 'false');
    button.innerHTML = '<img src="assets/vektra-logo.png" alt="">';

    var panel = document.createElement('div');
    panel.className = 'vektra-global-nav__panel';
    panel.innerHTML = '<div class="vektra-global-nav__brand"><img src="assets/vektra-logo.png" alt=""><span>Navigate Vektra</span></div>';

    var list = document.createElement('div');
    list.className = 'vektra-global-nav__links';
    links.forEach(function (item) {
      var anchor = document.createElement('a');
      anchor.className = 'vektra-global-nav__link';
      anchor.href = item.href;
      anchor.innerHTML = '<span class="' + item.icon + '" aria-hidden="true"></span><span>' + item.label + '</span>';
      if (normalizePath(item.href) === current) anchor.setAttribute('aria-current', 'page');
      list.appendChild(anchor);
    });
    panel.appendChild(list);
    nav.appendChild(button);
    nav.appendChild(panel);
    document.body.appendChild(nav);

    function setOpen(open) {
      nav.setAttribute('data-open', open ? 'true' : 'false');
      button.setAttribute('aria-expanded', open ? 'true' : 'false');
      button.setAttribute('aria-label', open ? 'Close page navigation' : 'Open page navigation');
    }

    button.addEventListener('click', function (event) {
      event.stopPropagation();
      setOpen(nav.getAttribute('data-open') !== 'true');
    });
    document.addEventListener('click', function (event) {
      if (!nav.contains(event.target)) setOpen(false);
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') setOpen(false);
    });
  }

  function applyLivelyThemeClasses() {
    var body = document.body;
    if (!body) return;

    var params = new URLSearchParams(window.location.search || '');
    var userAgent = navigator.userAgent || '';
    var theme = localStorage.getItem('lively-theme') || 'brutal';
    if (!/^(brutal|glass|neon)$/.test(theme)) theme = 'brutal';

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
    ensureVektraGlobalNav();
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
