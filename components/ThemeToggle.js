function ThemeToggle() {
  try {
    const [theme, setTheme] = React.useState(localStorage.getItem('lively-theme') || 'brutal');
    const [animations, setAnimations] = React.useState(localStorage.getItem('lively-animations') !== 'false');
    const [isOpen, setIsOpen] = React.useState(false);

    React.useEffect(() => {
      document.body.className = `theme-${theme} ${animations ? '' : 'animations-reduced'}`.trim();
      window.dispatchEvent(new CustomEvent('themeChange', { detail: theme }));
      window.dispatchEvent(new CustomEvent('animationsChange', { detail: animations }));
    }, [theme, animations]);

    const toggleTheme = () => {
      const newTheme = theme === 'brutal' ? 'glass' : 'brutal';
      setTheme(newTheme);
      localStorage.setItem('lively-theme', newTheme);
    };

    const toggleAnimations = () => {
      const newAnim = !animations;
      setAnimations(newAnim);
      localStorage.setItem('lively-animations', newAnim.toString());
    };

    return (
      <div data-name="global-settings" data-file="components/ThemeToggle.js">
        {/* Floating Gear Button */}
        <button 
          onClick={() => setIsOpen(true)}
          className={`fixed bottom-6 right-6 z-[9990] flex items-center justify-center w-14 h-14 rounded-full transition-all duration-500 hover:rotate-90
            ${theme === 'brutal' 
              ? 'bg-black text-lime border-4 border-white shadow-[4px_4px_0px_#ff00ff] hover:shadow-[2px_2px_0px_#ff00ff]' 
              : 'bg-glassBg text-neonViolet border border-white/20 backdrop-blur-xl shadow-[0_0_20px_rgba(176,38,255,0.4)] hover:bg-white/10 hover:scale-110'
            }`}
          title="Global Settings"
        >
          <div className="icon-settings text-2xl"></div>
        </button>

        {/* Settings Modal */}
        {isOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setIsOpen(false)}>
            <div 
              className={`w-full max-w-sm p-6 relative animate-[scale-in_0.2s_ease-out]
                ${theme === 'brutal' 
                  ? 'bg-dark border-4 border-white shadow-[8px_8px_0px_#ccff00] rounded-none' 
                  : 'bg-glassBg border border-glassBorder backdrop-blur-2xl shadow-[0_16px_40px_rgba(0,0,0,0.5)] rounded-2xl'
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
                <div className="icon-sliders"></div> System Config
              </h2>

              <div className="space-y-6">
                {/* Theme Toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-mono font-bold text-sm uppercase">Interface Mode</div>
                    <div className={`text-xs ${theme === 'brutal' ? 'text-gray-400' : 'text-gray-500'}`}>Current: {theme.toUpperCase()}</div>
                  </div>
                  <button 
                    onClick={toggleTheme}
                    className={`relative inline-flex h-8 w-16 items-center transition-colors focus:outline-none 
                      ${theme === 'glass' ? 'bg-neonViolet' : 'bg-gray-600'} 
                      ${theme === 'brutal' ? 'border-2 border-white shadow-[2px_2px_0px_#ccff00]' : 'rounded-full border border-white/20'}`}
                  >
                    <span className={`inline-block h-6 w-6 transform transition-transform 
                      ${theme === 'glass' ? 'translate-x-9 bg-white' : 'translate-x-1 bg-lime'} 
                      ${theme === 'brutal' ? 'border-2 border-black' : 'rounded-full shadow-md'}`} 
                    />
                  </button>
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
              </div>
              
              <div className="mt-8 pt-4 border-t border-white/20 text-center">
                <span className="font-mono text-xs text-gray-500">Vektra v1.0.2</span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  } catch (error) {
    console.error('ThemeToggle (Settings) error:', error);
    return null;
  }
}