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
    return (
      <div className="min-h-screen relative py-8 px-4 sm:px-6 lg:px-8" data-name="profile-app" data-file="profile-app.js">
        
        {/* Background glow effects */}
        <div className="bg-glow fixed top-[-20%] left-[-10%] w-[50%] h-[50%] bg-neonViolet rounded-full mix-blend-screen filter blur-[120px] opacity-20 pointer-events-none"></div>
        <div className="bg-glow fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-600 rounded-full mix-blend-screen filter blur-[120px] opacity-10 pointer-events-none"></div>
        
        <div className="max-w-7xl mx-auto relative z-10 flex flex-col gap-8">
          
          {/* Header */}
          <header className="glass-panel p-4 px-6 flex justify-between items-center sticky top-4 z-50">
            <a href="workspace.html" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors font-mono text-sm uppercase tracking-wider group">
              <div className="icon-arrow-left group-hover:-translate-x-1 transition-transform"></div> Workspace
            </a>
            <h1 className="font-mono text-xl font-bold tracking-widest text-white flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-neonViolet animate-pulse shadow-[0_0_8px_#b026ff]"></div>
              USER EVOLUTION
            </h1>
            <div className="w-24 hidden sm:block"></div> {/* Spacer for centering */}
          </header>

          <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left Column */}
            <div className="lg:col-span-5 flex flex-col gap-8">
              <AvatarSection />
              <RecentBadges />
            </div>

            {/* Right Column */}
            <div className="lg:col-span-7 flex flex-col gap-8">
              <StatsGrid />
              <SkillTree />
            </div>

          </main>

        </div>
        
        <ThemeToggle />
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