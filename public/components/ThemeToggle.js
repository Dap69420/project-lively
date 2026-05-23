function ThemeToggle() {
  try {
    const [theme, setTheme] = React.useState(localStorage.getItem('lively-theme') || 'brutal');
    const [animations, setAnimations] = React.useState(localStorage.getItem('lively-animations') !== 'false');
    const [sounds, setSounds] = React.useState(localStorage.getItem('lively-sounds') !== 'false');
    const [compactUi, setCompactUi] = React.useState(localStorage.getItem('lively-compact-ui') === 'true');
    const [isOpen, setIsOpen] = React.useState(false);
    const [levelUp, setLevelUp] = React.useState(null);
    const themes = [
      { id: 'brutal', label: 'Brutal', icon: 'icon-box' },
      { id: 'glass', label: 'Glass', icon: 'icon-sparkles' },
      { id: 'neon', label: 'Neon', icon: 'icon-radio-tower' }
    ];

    const getAppModeClasses = () => {
      const params = new URLSearchParams(window.location.search || '');
      const userAgent = navigator.userAgent || '';
      const isDesktopApp = params.get('desktop') === '1' || /Electron/i.test(userAgent);
      const isNativeApp = params.get('app') === '1' || isDesktopApp ||
        Boolean(window.Capacitor && (
          window.Capacitor?.isNativePlatform?.() ||
          (window.Capacitor?.getPlatform && window.Capacitor.getPlatform() !== 'web')
        )) ||
        /\bwv\b/i.test(userAgent);
      const isMobileShell = isNativeApp || window.matchMedia?.('(max-width: 760px), (pointer: coarse)')?.matches;
      return {
        isDesktopApp,
        isNativeApp,
        isMobileShell
      };
    };

    const playSfx = React.useCallback((type = 'click') => {
      if (!sounds) return;
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const context = new AudioContext();
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const tones = {
          click: [520, 0.035, 'square', 0.025],
          success: [740, 0.12, 'triangle', 0.045],
          level: [880, 0.18, 'sawtooth', 0.04],
          error: [180, 0.12, 'square', 0.03]
        };
        const [frequency, duration, wave, volume] = tones[type] || tones.click;
        oscillator.type = wave;
        oscillator.frequency.setValueAtTime(frequency, context.currentTime);
        if (type === 'level') {
          oscillator.frequency.exponentialRampToValueAtTime(1320, context.currentTime + duration);
        }
        gain.gain.setValueAtTime(volume, context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start();
        oscillator.stop(context.currentTime + duration);
        window.setTimeout(() => context.close?.(), Math.ceil((duration + 0.05) * 1000));
      } catch (_error) {
        // SFX are decorative; ignore browser audio restrictions.
      }
    }, [sounds]);

    React.useEffect(() => {
      const mode = getAppModeClasses();
      document.body.classList.remove('theme-brutal', 'theme-glass', 'theme-neon', 'animations-reduced', 'ui-compact', 'app-native', 'app-desktop', 'app-mobile-shell');
      document.body.classList.add(`theme-${theme}`);
      if (!animations) document.body.classList.add('animations-reduced');
      if (compactUi) document.body.classList.add('ui-compact');
      if (mode.isNativeApp) document.body.classList.add('app-native');
      if (mode.isDesktopApp) document.body.classList.add('app-desktop');
      if (mode.isMobileShell) document.body.classList.add('app-mobile-shell');
      window.dispatchEvent(new CustomEvent('themeChange', { detail: theme }));
      window.dispatchEvent(new CustomEvent('animationsChange', { detail: animations }));
      window.dispatchEvent(new CustomEvent('compactUiChange', { detail: compactUi }));
    }, [theme, animations, compactUi]);

    React.useEffect(() => {
      const handleLevelUp = (event) => {
        const detail = event.detail || {};
        setLevelUp({
          level: detail.level || detail.newLevel || '?',
          previousLevel: detail.previousLevel || ''
        });
        playSfx('level');
        window.setTimeout(() => setLevelUp(null), 2600);
      };

      window.addEventListener('livelyLevelUp', handleLevelUp);
      return () => window.removeEventListener('livelyLevelUp', handleLevelUp);
    }, [playSfx]);

    React.useEffect(() => {
      const handleSfx = (event) => playSfx(event.detail?.type || event.detail || 'click');
      const handleGlobalClick = (event) => {
        if (event.target?.closest?.('button,a,[role="button"]')) {
          playSfx('click');
        }
      };
      window.addEventListener('livelyPlaySfx', handleSfx);
      document.addEventListener('click', handleGlobalClick, true);
      return () => {
        window.removeEventListener('livelyPlaySfx', handleSfx);
        document.removeEventListener('click', handleGlobalClick, true);
      };
    }, [playSfx]);

    const toggleTheme = () => {
      const index = Math.max(0, themes.findIndex((item) => item.id === theme));
      const newTheme = themes[(index + 1) % themes.length].id;
      setTheme(newTheme);
      localStorage.setItem('lively-theme', newTheme);
    };

    const toggleAnimations = () => {
      const newAnim = !animations;
      setAnimations(newAnim);
      localStorage.setItem('lively-animations', newAnim.toString());
    };

    const toggleSounds = () => {
      const newSounds = !sounds;
      setSounds(newSounds);
      localStorage.setItem('lively-sounds', newSounds.toString());
      if (newSounds) window.setTimeout(() => playSfx('success'), 0);
    };

    const toggleCompactUi = () => {
      const nextCompact = !compactUi;
      setCompactUi(nextCompact);
      localStorage.setItem('lively-compact-ui', nextCompact.toString());
    };

    return (
      <div data-name="global-settings" data-file="components/ThemeToggle.js">
        <style>{`
          @keyframes slide-in-right {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }
          body.ui-compact .glass-panel,
          body.ui-compact .brutal-card {
            padding: 1rem !important;
          }
          body.ui-compact input,
          body.ui-compact select,
          body.ui-compact textarea,
          body.ui-compact button,
          body.ui-compact a {
            min-height: unset;
          }
        `}</style>
        {/* Bottom Settings Button */}
        <button 
          onClick={() => setIsOpen(true)}
          className={`fixed bottom-4 left-4 z-[9990] flex items-center justify-center w-11 h-11 rounded-lg transition-all duration-300
            ${theme === 'brutal' 
              ? 'bg-black text-lime border-2 border-white shadow-[4px_4px_0px_#ff00ff] hover:translate-x-[-1px] hover:translate-y-[-1px]' 
              : 'bg-glassBg text-neonViolet border border-white/20 backdrop-blur-xl shadow-[0_0_20px_rgba(176,38,255,0.25)] hover:bg-white/10'
            }`}
          title="Global Settings"
          aria-label="Open settings"
        >
          <div className="icon-menu text-2xl"></div>
        </button>

        {/* Settings Sidebar */}
        {isOpen && (
          <div className="fixed inset-0 z-[9999] flex justify-end bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setIsOpen(false)}>
            <div 
              className={`h-full w-full max-w-sm p-6 relative animate-[slide-in-right_0.22s_ease-out]
                ${theme === 'brutal' 
                  ? 'bg-dark border-l-4 border-white shadow-[-8px_0px_0px_#ccff00] rounded-none' 
                  : 'bg-darkBg/95 border-l border-glassBorder backdrop-blur-2xl shadow-[0_16px_40px_rgba(0,0,0,0.5)]'
                }`}
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                onClick={() => setIsOpen(false)}
                className={`absolute top-4 right-4 ${theme === 'brutal' ? 'text-white hover:text-hotpink' : 'text-gray-400 hover:text-white'} transition-colors`}
              >
                <div className="icon-x text-2xl"></div>
              </button>

              <h2 className="text-2xl font-bold uppercase tracking-tight mb-6 flex items-center gap-2 border-b border-white/20 pb-4">
                <div className="icon-sliders"></div> Settings
              </h2>

              <div className="space-y-6">
                {/* Theme Toggle */}
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <div className="font-mono font-bold text-sm uppercase">Interface Mode</div>
                      <div className={`text-xs ${theme === 'brutal' ? 'text-gray-400' : 'text-gray-500'}`}>Current: {theme.toUpperCase()}</div>
                    </div>
                    <button onClick={toggleTheme} className="rounded border border-white/20 px-3 py-2 font-mono text-xs uppercase text-gray-300 hover:text-white">
                      Cycle
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {themes.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          setTheme(item.id);
                          localStorage.setItem('lively-theme', item.id);
                        }}
                        className={`rounded-lg border px-2 py-3 text-center transition-colors ${theme === item.id ? 'border-lime bg-lime text-black' : 'border-white/10 bg-white/5 text-gray-300 hover:bg-white/10'}`}
                      >
                        <div className={`${item.icon} mx-auto mb-1 text-lg`}></div>
                        <div className="font-mono text-[10px] uppercase">{item.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Animations Toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-mono font-bold text-sm uppercase">Motion Effects</div>
                    <div className={`text-xs ${theme === 'brutal' ? 'text-gray-400' : 'text-gray-500'}`}>Enable extra UI animations</div>
                  </div>
                  <button 
                    onClick={toggleAnimations}
                    className={`relative inline-flex h-8 w-16 items-center transition-colors focus:outline-none 
                      ${animations ? (theme === 'brutal' ? 'bg-lime' : 'bg-neonViolet') : 'bg-gray-600'} 
                      ${theme === 'brutal' ? 'border-2 border-white shadow-[2px_2px_0px_#ff00ff]' : 'rounded-full border border-white/20'}`}
                  >
                    <span className={`inline-block h-6 w-6 transform transition-transform 
                      ${animations ? 'translate-x-9' : 'translate-x-1'} 
                      ${theme === 'brutal' ? 'border-2 border-black bg-white' : 'rounded-full bg-white shadow-md'}`} 
                    />
                  </button>
                </div>

                {/* Sound Toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-mono font-bold text-sm uppercase">Sound Effects</div>
                    <div className={`text-xs ${theme === 'brutal' ? 'text-gray-400' : 'text-gray-500'}`}>Tiny UI bleeps and level-up sound</div>
                  </div>
                  <button 
                    onClick={toggleSounds}
                    className={`relative inline-flex h-8 w-16 items-center transition-colors focus:outline-none 
                      ${sounds ? (theme === 'brutal' ? 'bg-lime' : 'bg-neonViolet') : 'bg-gray-600'} 
                      ${theme === 'brutal' ? 'border-2 border-white shadow-[2px_2px_0px_#ff00ff]' : 'rounded-full border border-white/20'}`}
                  >
                    <span className={`inline-block h-6 w-6 transform transition-transform 
                      ${sounds ? 'translate-x-9' : 'translate-x-1'} 
                      ${theme === 'brutal' ? 'border-2 border-black bg-white' : 'rounded-full bg-white shadow-md'}`} 
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-mono font-bold text-sm uppercase">Compact UI</div>
                    <div className={`text-xs ${theme === 'brutal' ? 'text-gray-400' : 'text-gray-500'}`}>Tighter panels for small screens</div>
                  </div>
                  <button
                    onClick={toggleCompactUi}
                    className={`relative inline-flex h-8 w-16 items-center transition-colors focus:outline-none
                      ${compactUi ? (theme === 'brutal' ? 'bg-lime' : 'bg-neonViolet') : 'bg-gray-600'}
                      ${theme === 'brutal' ? 'border-2 border-white shadow-[2px_2px_0px_#ff00ff]' : 'rounded-full border border-white/20'}`}
                  >
                    <span className={`inline-block h-6 w-6 transform transition-transform
                      ${compactUi ? 'translate-x-9' : 'translate-x-1'}
                      ${theme === 'brutal' ? 'border-2 border-black bg-white' : 'rounded-full bg-white shadow-md'}`}
                    />
                  </button>
                </div>
              </div>
              
              <div className="mt-8 pt-4 border-t border-white/20 text-center">
                <span className="font-mono text-xs text-gray-500">Vektra v1.0.2</span>
              </div>
            </div>
          </div>
        )}

        {levelUp ? (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-sm pointer-events-none">
            <div className="relative text-center">
              <div className="absolute inset-0 scale-150 rounded-full bg-neonViolet/20 blur-3xl animate-ping"></div>
              <div className="relative border-4 border-white bg-black px-10 py-8 shadow-[10px_10px_0px_#ccff00]">
                <div className="font-mono text-xs uppercase tracking-[0.35em] text-lime mb-2">Level Up</div>
                <div className="font-pixel text-7xl text-white leading-none">{levelUp.level}</div>
                <div className="mt-3 font-mono text-sm text-gray-300">New rank unlocked</div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    );
  } catch (error) {
    console.error('ThemeToggle (Settings) error:', error);
    return null;
  }
}
