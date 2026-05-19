class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-dark text-white p-8">
          <div className="brutal-card brutal-card-pink text-center">
            <h1 className="text-4xl mb-4 text-hotpink">System Glitch</h1>
            <p className="mb-6 font-mono">Something unexpected happened in the matrix.</p>
            <button
              onClick={() => window.location.reload()}
              className="brutal-btn-lime"
            >
              Reboot System
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function App() {
  try {
    const [user, setUser] = React.useState(null);
    const [authChecked, setAuthChecked] = React.useState(false);
    const [downloadPrompt, setDownloadPrompt] = React.useState(null);

    React.useEffect(() => {
      if (!window.supabaseClient) {
        setAuthChecked(true);
        return;
      }

      window.supabaseClient.auth.getSession().then(({ data: { session } }) => {
        setUser(session?.user || null);
        setAuthChecked(true);
        if (session?.user && window.LivelyProgress?.setUserContext) {
          window.LivelyProgress.setUserContext(session.user).catch((error) => {
            console.error('Landing progress hydration failed:', error);
          });
        }
      });

      const { data: { subscription } } = window.supabaseClient.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user || null);
        if (session?.user && window.LivelyProgress?.setUserContext) {
          window.LivelyProgress.setUserContext(session.user).catch(() => {});
        }
      });

      return () => subscription.unsubscribe();
    }, []);

    React.useEffect(() => {
      const isNativeApp = () => {
        if (new URLSearchParams(window.location.search || '').get('app') === '1') return true;
        if (new URLSearchParams(window.location.search || '').get('desktop') === '1') return true;
        if (window.Capacitor?.isNativePlatform?.()) return true;
        if (window.Capacitor?.getPlatform && window.Capacitor.getPlatform() !== 'web') return true;
        if (/Electron/i.test(navigator.userAgent || '')) return true;
        return /\bwv\b/i.test(navigator.userAgent || '');
      };
      if (isNativeApp()) return;

      const userAgent = navigator.userAgent || '';
      const isAndroid = /Android/i.test(userAgent);
      const isDesktop = !window.matchMedia?.('(max-width: 768px), (pointer: coarse)')?.matches;
      if (isAndroid) {
        setDownloadPrompt({
          type: 'android',
          icon: 'icon-smartphone',
          eyebrow: 'Android App Available',
          title: 'Download Project Lively',
          text: 'The Android app gives the workspace a cleaner full-screen mobile feel.',
          href: '/download/android',
          cta: 'Get APK'
        });
      } else if (isDesktop) {
        setDownloadPrompt({
          type: 'windows',
          icon: 'icon-monitor-down',
          eyebrow: 'Windows App Available',
          title: 'Install Project Lively',
          text: 'The Windows app opens Project Lively like a real desktop app with no browser tabs.',
          href: '/download/windows',
          cta: 'Get Installer'
        });
      }
    }, []);

    const dismissDownloadPrompt = () => {
      setDownloadPrompt(null);
    };

    const progress = window.LivelyProgress?.useProgress ? window.LivelyProgress.useProgress() : {};
    const alias = progress.username || user?.user_metadata?.alias || user?.email?.split('@')?.[0] || 'Student';

    return (
      <div className="min-h-screen flex flex-col items-center overflow-x-hidden relative" data-name="app" data-file="app.js">
        {downloadPrompt ? (
          <div className="fixed inset-x-3 top-3 z-[9995] border-4 border-white bg-dark p-4 shadow-[6px_6px_0px_#ccff00] md:left-auto md:right-6 md:top-6 md:w-[360px]">
            <div className="flex items-start gap-3">
              <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center border-2 border-black bg-lime text-black shadow-[2px_2px_0px_#ff00ff]">
                <div className={`${downloadPrompt.icon} text-xl`}></div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-mono text-xs uppercase tracking-[0.2em] text-lime">{downloadPrompt.eyebrow}</div>
                <div className="mt-1 text-lg font-black uppercase leading-tight">{downloadPrompt.title}</div>
                <p className="mt-1 text-xs font-mono text-white/70">{downloadPrompt.text}</p>
                <div className="mt-3 flex gap-2">
                  <a href={downloadPrompt.href} className="flex-1 bg-lime px-3 py-2 text-center text-xs font-black uppercase text-black">
                    {downloadPrompt.cta}
                  </a>
                  <button onClick={dismissDownloadPrompt} className="border border-white/20 px-3 py-2 text-xs font-mono uppercase text-white/70">
                    Later
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
        
        {/* Background glow effects */}
        <div className="bg-glow fixed top-[-20%] left-[-10%] w-[50%] h-[50%] bg-neonViolet rounded-full mix-blend-screen filter blur-[120px] opacity-20 pointer-events-none z-0"></div>
        <div className="bg-glow fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-600 rounded-full mix-blend-screen filter blur-[120px] opacity-10 pointer-events-none z-0"></div>

        {/* Navigation / Header */}
        <header className="w-full max-w-6xl mx-auto p-6 flex justify-between items-center border-b-4 border-white/10 relative z-10" data-name="header">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-lime border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_#ff00ff]">
              <div className="icon-zap text-xl text-black"></div>
            </div>
            <h1 className="text-2xl text-lime tracking-tighter">PROJECT LIVELY</h1>
          </div>
          <nav className="hidden md:flex items-center gap-6 font-mono text-sm">
            <a href="#features" className="hover:text-lime transition-colors">FEATURES</a>
            <a href="#roadmap" className="hover:text-hotpink transition-colors">ROADMAP</a>
            <a href="download" className="hover:text-lime transition-colors">DOWNLOAD</a>
            <a href="#donate" className="hover:text-lime transition-colors">SUPPORT US</a>
            {user ? (
              <div className="ml-4 flex items-center gap-3">
                <a href="profile.html" className="max-w-36 truncate text-lime hover:underline" title={alias}>@{alias}</a>
                <a href="workspace.html" className="bg-lime text-black px-4 py-1.5 border-2 border-black font-bold shadow-[2px_2px_0px_#ff00ff] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all">
                  OPEN APP
                </a>
              </div>
            ) : (
              <a href="login.html" className="bg-lime text-black px-4 py-1.5 border-2 border-black font-bold shadow-[2px_2px_0px_#ff00ff] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all ml-4">
                {authChecked ? 'LOGIN' : '...'}
              </a>
            )}
          </nav>
        </header>

        <main className="w-full flex-grow flex flex-col items-center">
          <Hero />
          <Features />
          <Roadmap />
          <Donation />
        </main>

        <footer className="w-full border-t-4 border-white/20 mt-20 p-8 flex flex-col items-center gap-4 text-center" data-name="footer">
          <a href="founders.html" className="font-mono text-sm font-bold text-lime hover:underline underline-offset-4 decoration-2 uppercase flex items-center gap-2">
            <div className="icon-flask-conical text-xs"></div> Visit the Founder's Lab
          </a>
          <p className="font-mono text-white/50 text-sm">
            &copy; 2026 Project Lively. Built by students, for students. 
          </p>
        </footer>
        
        <ThemeToggle />
      </div>
    );
  } catch (error) {
    console.error('App component error:', error);
    return null;
  }
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
