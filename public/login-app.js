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
            <p className="mb-3 font-mono">Something unexpected happened in the matrix.</p>
            {this.state.error?.message ? (
              <p className="mb-6 break-words rounded border border-red-400/40 bg-red-500/10 p-3 text-left font-mono text-xs text-red-100">
                {this.state.error.message}
              </p>
            ) : null}
            <button onClick={() => window.location.reload()} className="brutal-btn-lime">Reboot System</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function LoginApp() {
  try {
    const [isLogin, setIsLogin] = React.useState(true);
    const [isLoading, setIsLoading] = React.useState(false);
    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [alias, setAlias] = React.useState('');
    const [errorMsg, setErrorMsg] = React.useState('');
    const [currentUser, setCurrentUser] = React.useState(null);
    const [showSetup, setShowSetup] = React.useState(false);
    const [nativeMode, setNativeMode] = React.useState(false);
    const nativeRedirectUrl = 'com.buddyai.lively://login';
    const getCapacitorPlugin = (name) => {
      try {
        return window.Capacitor?.Plugins?.[name] || window.Capacitor?.[name] || null;
      } catch (_error) {
        return null;
      }
    };
    const isNativeApp = () => {
      try {
        if (!window.Capacitor) return false;
        if (typeof window.Capacitor.isNativePlatform === 'function') {
          return Boolean(window.Capacitor.isNativePlatform());
        }
        return Boolean(window.Capacitor.getPlatform && window.Capacitor.getPlatform() !== 'web');
      } catch (_error) {
        return false;
      }
    };

    const checkSetupCompletion = (user) => {
      if (user?.user_metadata?.setupComplete) {
        window.location.href = 'profile.html';
      } else {
        setCurrentUser(user);
        setShowSetup(true);
      }
    };

    React.useEffect(() => {
      setNativeMode(isNativeApp() || new URLSearchParams(window.location.search || '').get('app') === '1');

      if (supabaseClient) {
        supabaseClient.auth.getSession().then(({ data: { session } }) => {
          if (session) {
            checkSetupCompletion(session.user);
          }
        });
      }
    }, []);

    React.useEffect(() => {
      const AppPlugin = getCapacitorPlugin('App');
      const BrowserPlugin = getCapacitorPlugin('Browser');
      if (!supabaseClient || !AppPlugin || !isNativeApp()) return;

      let listenerHandle = null;

      const completeNativeLogin = async (url) => {
        if (!url || !String(url).startsWith(nativeRedirectUrl)) return;

        try {
          const callbackUrl = new URL(url);
          const queryParams = callbackUrl.searchParams;
          const hashParams = new URLSearchParams(String(callbackUrl.hash || '').replace(/^#/, ''));
          const errorDescription = queryParams.get('error_description') || hashParams.get('error_description');

          if (errorDescription) {
            throw new Error(errorDescription);
          }

          const code = queryParams.get('code') || hashParams.get('code');
          const accessToken = hashParams.get('access_token') || queryParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token') || queryParams.get('refresh_token');

          if (code) {
            const { data, error } = await supabaseClient.auth.exchangeCodeForSession(code);
            if (error) throw error;
            await BrowserPlugin?.close?.();
            checkSetupCompletion(data?.session?.user || data?.user);
            return;
          }

          if (accessToken && refreshToken) {
            const { data, error } = await supabaseClient.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken
            });
            if (error) throw error;
            await BrowserPlugin?.close?.();
            checkSetupCompletion(data?.session?.user || data?.user);
          }
        } catch (error) {
          console.error('Native login callback failed:', error);
          setErrorMsg(error.message || 'Login callback failed.');
          setIsLoading(false);
          try {
            await BrowserPlugin?.close?.();
          } catch (_closeError) {
            // Ignore close failures.
          }
        }
      };

      try {
        const maybeHandle = AppPlugin.addListener('appUrlOpen', ({ url }) => completeNativeLogin(url));
        if (maybeHandle?.then) {
          maybeHandle.then((handle) => {
            listenerHandle = handle;
          });
        } else {
          listenerHandle = maybeHandle;
        }
      } catch (error) {
        console.error('Failed to register native login listener:', error);
      }

      if (typeof AppPlugin.getLaunchUrl === 'function') {
        AppPlugin.getLaunchUrl()
          .then((launchUrl) => completeNativeLogin(launchUrl?.url))
          .catch((error) => console.error('Failed to read launch URL:', error));
      }

      return () => {
        if (listenerHandle?.remove) {
          listenerHandle.remove();
        }
      };
    }, []);

    const handleSubmit = async (e) => {
      e.preventDefault();
      if (!supabaseClient) return;
      setErrorMsg('');
      setIsLoading(true);

      try {
        if (isLogin) {
          const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
          if (error) throw error;
          checkSetupCompletion(data.user);
        } else {
          const { data, error } = await supabaseClient.auth.signUp({
            email,
            password,
            options: {
              data: { alias: alias || email.split('@')[0] }
            }
          });
          if (error) throw error;
          checkSetupCompletion(data.user);
        }
      } catch (err) {
        console.error(err);
        setErrorMsg(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    const handleGoogleLogin = async () => {
      if (!supabaseClient) return;
      try {
        setIsLoading(true);
        const native = isNativeApp();
        const { data, error } = await supabaseClient.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: native ? nativeRedirectUrl : window.location.origin + '/login.html',
            skipBrowserRedirect: native
          }
        });
        if (error) throw error;
        if (native && data?.url) {
          const BrowserPlugin = getCapacitorPlugin('Browser');
          if (BrowserPlugin?.open) {
            await BrowserPlugin.open({ url: data.url, presentationStyle: 'fullscreen' });
          } else {
            window.location.href = data.url;
          }
        }
      } catch (error) {
        console.error('Auth error:', error);
        alert('Failed to connect: ' + error.message);
        setIsLoading(false);
      }
    };

    return (
      <>
        {showSetup && currentUser ? (
          <ProfileSetup 
            user={currentUser}
            onComplete={() => {
              setTimeout(() => {
                window.location.href = 'profile.html';
              }, 500);
            }}
          />
        ) : null}
        
        <div className="flex-grow flex flex-col items-center justify-center p-6 relative overflow-hidden" data-name="login-app" data-file="login-app.js">
        
        {/* Background glow effects */}
        <div className="bg-glow fixed top-[-20%] left-[-10%] w-[50%] h-[50%] bg-neonViolet rounded-full mix-blend-screen filter blur-[120px] opacity-20 pointer-events-none z-0"></div>
        <div className="bg-glow fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-600 rounded-full mix-blend-screen filter blur-[120px] opacity-10 pointer-events-none z-0"></div>

        {/* Decorative background elements */}
        <div className="absolute top-10 left-10 text-[10rem] font-black font-mono text-white opacity-5 select-none -rotate-12 pointer-events-none">CTRL</div>
        <div className="absolute bottom-10 right-10 text-[10rem] font-black font-mono text-white opacity-5 select-none rotate-12 pointer-events-none">ALT</div>

        {!nativeMode ? (
          <a href="index.html" className="absolute top-6 left-6 flex items-center gap-2 text-white hover:text-lime transition-colors font-mono font-bold group relative z-10">
            <div className="icon-arrow-left transform group-hover:-translate-x-1 transition-transform"></div> BACK TO BASE
          </a>
        ) : null}

        <div className="w-full max-w-md relative z-10">
          {/* Logo Header */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-12 h-12 bg-lime border-4 border-black flex items-center justify-center shadow-[4px_4px_0px_#ff00ff]">
              <div className="icon-zap text-2xl text-black"></div>
            </div>
            <h1 className="text-4xl text-white tracking-tighter">LIVELY</h1>
          </div>

          <div className="brutal-card brutal-card-pink bg-black">
            <div className="flex justify-between items-center mb-8 border-b-4 border-white/20 pb-4">
              <div>
                <h2 className="text-2xl text-lime">{nativeMode ? 'MOBILE ACCESS' : (isLogin ? 'ACCESS GRANTED' : 'NEW RECRUIT')}</h2>
                {nativeMode ? (
                  <p className="mt-2 font-mono text-xs uppercase tracking-wider text-gray-400">Use Google to continue in the app</p>
                ) : null}
              </div>
              {!nativeMode ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsLogin(true)}
                    className={`font-mono font-bold text-sm px-2 py-1 ${isLogin ? 'bg-hotpink text-white border-2 border-white' : 'text-gray-500 hover:text-white'}`}
                  >
                    LOGIN
                  </button>
                  <button
                    onClick={() => setIsLogin(false)}
                    className={`font-mono font-bold text-sm px-2 py-1 ${!isLogin ? 'bg-hotpink text-white border-2 border-white' : 'text-gray-500 hover:text-white'}`}
                  >
                    SIGN UP
                  </button>
                </div>
              ) : null}
            </div>

            {errorMsg && (
              <div className="mb-4 bg-red-500 text-white p-3 font-mono text-sm border-2 border-white shadow-[4px_4px_0px_#ff00ff]">
                {errorMsg}
              </div>
            )}

            {!nativeMode ? (
            <>
            <form onSubmit={handleSubmit} className="space-y-6">
              {!isLogin && (
                <div className="space-y-2">
                  <label className="font-mono font-bold text-sm text-gray-300 uppercase">Agent Alias</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <div className="icon-user text-gray-500"></div>
                    </div>
                    <input type="text" required value={alias} onChange={e => setAlias(e.target.value)} className="brutal-input pl-10" placeholder="e.g. PhysicsNinja" />
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <label className="font-mono font-bold text-sm text-gray-300 uppercase">Comm Link (Email)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <div className="icon-mail text-gray-500"></div>
                  </div>
                  <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="brutal-input pl-10" placeholder="student@school.edu" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="font-mono font-bold text-sm text-gray-300 uppercase">Secret Passcode</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <div className="icon-lock text-gray-500"></div>
                  </div>
                  <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="brutal-input pl-10" placeholder="••••••••" />
                </div>
              </div>

              <button type="submit" disabled={isLoading} className="brutal-btn-lime w-full flex justify-center items-center gap-2 mt-4 text-xl disabled:opacity-50">
                {isLoading ? 'PROCESSING...' : (isLogin ? 'INITIALIZE SESSION' : 'CREATE AVATAR')} <div className="icon-arrow-right"></div>
              </button>
            </form>

            <div className="mt-6 flex items-center justify-between">
              <div className="w-full h-1 bg-white/20"></div>
              <span className="px-4 font-mono text-sm text-gray-400 font-bold uppercase">OR</span>
              <div className="w-full h-1 bg-white/20"></div>
            </div>
            </>
            ) : null}

            <button 
              type="button" 
              onClick={handleGoogleLogin} 
              disabled={isLoading}
              className="w-full bg-white text-black font-bold uppercase border-4 border-black px-6 py-3 shadow-[6px_6px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0px_#000] active:translate-x-[6px] active:translate-y-[6px] active:shadow-none transition-all flex justify-center items-center gap-3 mt-6"
            >
              <div className="icon-globe text-xl"></div>
              {isLoading ? 'CONNECTING...' : 'CONTINUE WITH GOOGLE'}
            </button>
          </div>
        </div>
        
        <ThemeToggle />
      </div>
      </>
    );
  } catch (error) {
    console.error('LoginApp component error:', error);
    return null;
  }
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <ErrorBoundary>
    <LoginApp />
  </ErrorBoundary>
);
