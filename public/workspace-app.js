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
        <div className="h-screen flex items-center justify-center bg-discordDarkest text-white p-8">
          <div className="bg-discordDarker p-8 border-2 border-red-500 rounded-lg text-center max-w-md">
            <div className="icon-circle-x text-5xl text-red-500 mb-4 mx-auto"></div>
            <h1 className="text-2xl font-bold mb-2">Workspace Error</h1>
            <p className="text-gray-400 mb-6 font-mono text-sm">A glitch in the matrix occurred.</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-mcGreen text-black font-bold px-6 py-2 rounded hover:bg-green-400 transition-colors"
            >
              RELOAD WORKSPACE
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function WorkspaceApp() {
  try {
    return (
      <div className="h-screen w-full flex flex-col bg-discordDarkest relative overflow-hidden" data-name="workspace-app" data-file="workspace-app.js">
        {/* Background glow effects */}
        <div className="bg-glow fixed top-[-20%] left-[-10%] w-[50%] h-[50%] bg-neonViolet rounded-full mix-blend-screen filter blur-[120px] opacity-20 pointer-events-none z-0"></div>
        <div className="bg-glow fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-600 rounded-full mix-blend-screen filter blur-[120px] opacity-10 pointer-events-none z-0"></div>
        
        <div className="relative z-10 flex flex-col h-full w-full">
          <Header />
          
          <main className="flex-1 flex overflow-hidden">
            <Sidebar />
            
            <div className="flex-1 flex" style={{ minWidth: 0 }}>
              {/* Split Screen Duo-Mode */}
              <MissionCard />
              <AIChat />
            </div>
          </main>
        </div>
        
        <ThemeToggle />
      </div>
    );
  } catch (error) {
    console.error('WorkspaceApp component error:', error);
    return null;
  }
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <ErrorBoundary>
    <WorkspaceApp />
  </ErrorBoundary>
);