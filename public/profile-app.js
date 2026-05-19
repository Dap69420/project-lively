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
        <div className="min-h-screen flex items-center justify-center bg-darkBg text-white p-8">
          <div className="glass-panel p-8 text-center border-red-500/50">
            <h1 className="text-2xl mb-4 text-red-400">Evolution Glitch</h1>
            <p className="mb-6 font-mono text-sm text-gray-400">Failed to load profile data.</p>
            <button onClick={() => window.location.reload()} className="px-6 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors">Reload Data</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function ProfileApp() {
  try {
    const [user, setUser] = React.useState(null);
    const [loading, setLoading] = React.useState(true);
    const [joinOpen, setJoinOpen] = React.useState(false);
    const progress = window.LivelyProgress.useProgress();

    React.useEffect(() => {
      if (!supabaseClient) {
        setLoading(false);
        return;
      }
      
      supabaseClient.auth.getSession().then(({ data: { session } }) => {
        if (!session) {
          window.location.href = 'login.html';
        } else {
          setUser(session.user);
        }
        setLoading(false);
      });
    }, []);

    React.useEffect(() => {
      if (!user || !window.LivelyProgress?.setUserContext) {
        return;
      }

      window.LivelyProgress.setUserContext(user).catch((error) => {
        console.error('Failed to hydrate user state:', error);
      });
    }, [user]);

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-darkBg text-white font-mono">LOADING PROFILE...</div>;
    const isParent = user?.user_metadata?.userType === 'parent';
    const isEducator = user?.user_metadata?.userType === 'educator';
    const adminAllowlist = Array.isArray(window.__APP_CONFIG__?.ADMIN_ALLOWED_EMAILS)
      ? window.__APP_CONFIG__.ADMIN_ALLOWED_EMAILS.map((email) => String(email || '').trim().toLowerCase())
      : [];
    const isAdmin = adminAllowlist.includes(String(user?.email || '').trim().toLowerCase());

    return (
      <div className="min-h-screen relative w-full max-w-full overflow-x-hidden py-4 px-3 sm:py-8 sm:px-6 lg:px-8" data-name="profile-app" data-file="profile-app.js">
        
        {/* Background glow effects */}
        <div className="bg-glow fixed top-[-20%] left-[-10%] w-[50%] h-[50%] bg-neonViolet rounded-full mix-blend-screen filter blur-[120px] opacity-20 pointer-events-none"></div>
        <div className="bg-glow fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-600 rounded-full mix-blend-screen filter blur-[120px] opacity-10 pointer-events-none"></div>
        
        <div className="w-full max-w-7xl mx-auto relative z-10 flex flex-col gap-5 sm:gap-8">
          
          {/* Header */}
          <header className="glass-panel profile-hero p-4 sm:px-6 flex items-center justify-between gap-3 sticky top-3 sm:top-4 z-50 overflow-hidden">
            <a href={(isParent || isEducator) ? 'index.html' : 'workspace.html'} className="shrink-0 flex items-center gap-2 text-gray-400 hover:text-white transition-colors font-mono text-xs sm:text-sm uppercase tracking-wider group">
              <div className="icon-arrow-left group-hover:-translate-x-1 transition-transform"></div> {(isParent || isEducator) ? 'Home' : 'Workspace'}
            </a>
            <h1 className="min-w-0 font-mono text-2xl sm:text-xl font-bold tracking-[0.18em] sm:tracking-widest text-white flex items-center justify-end sm:justify-center gap-2 sm:gap-3 text-right leading-tight">
              <div className="hidden sm:block w-2 h-2 rounded-full bg-neonViolet animate-pulse shadow-[0_0_8px_#b026ff] shrink-0"></div>
              {isParent ? 'PARENT DASHBOARD' : isEducator ? 'EDUCATOR STUDIO' : 'PROFILE'}
            </h1>
            <div className="flex shrink-0 items-center gap-2">
            {isAdmin ? (
              <a href="admin.html" className="hidden sm:flex h-10 items-center justify-center rounded-xl border border-neonViolet/40 bg-neonViolet/15 px-3 font-mono text-xs uppercase text-neonViolet hover:bg-neonViolet/25">
                Admin
              </a>
            ) : null}
            {!isParent && !isEducator ? (
              <div className="flex shrink-0 items-center gap-2">
                <a href="classrooms.html" className="hidden sm:flex h-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-3 font-mono text-xs uppercase text-gray-300 hover:text-white">Classes</a>
                <button onClick={() => setJoinOpen(true)} className="flex h-10 w-10 items-center justify-center rounded-xl border border-neonViolet/40 bg-neonViolet/15 text-neonViolet hover:bg-neonViolet/25" title="Join classroom">
                  <div className="icon-plus"></div>
                </button>
              </div>
            ) : (
              !isAdmin ? <div className="w-24 hidden sm:block"></div> : null
            )}
            {isAdmin ? (
              <a href="admin.html" className="flex h-10 w-10 items-center justify-center rounded-xl border border-neonViolet/40 bg-neonViolet/15 text-neonViolet hover:bg-neonViolet/25 sm:hidden" title="Admin panel">
                <div className="icon-shield"></div>
              </a>
            ) : null}
            </div>
          </header>

          {isParent ? (
            <ParentDashboard user={user} />
          ) : isEducator ? (
            <EducatorDashboard user={user} />
          ) : (
            <>
              <FamilyRequests user={user} />

              <main className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-8 min-w-0">
            
                {/* Left Column */}
                <div className="lg:col-span-5 flex flex-col gap-5 sm:gap-8 min-w-0">
                  <AvatarSection user={user} />
                  <CourseSelector />
                  <RecentBadges />
                </div>

                {/* Right Column */}
                <div className="lg:col-span-7 flex flex-col gap-5 sm:gap-8 min-w-0">
                  <StatsGrid />
                  <SkillTree />
                </div>

              </main>
            </>
          )}

        </div>
        
        <ThemeToggle />
        {joinOpen ? ReactDOM.createPortal((
          <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" onClick={() => setJoinOpen(false)}>
            <div className="w-full max-w-lg" onClick={(event) => event.stopPropagation()}>
              <ClassroomJoinCard user={user} />
            </div>
          </div>
        ), document.body) : null}
      </div>
    );
  } catch (error) {
    console.error('ProfileApp component error:', error);
    return null;
  }
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <ErrorBoundary>
    <ProfileApp />
  </ErrorBoundary>
);
