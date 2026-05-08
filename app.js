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
    return (
      <div className="min-h-screen flex flex-col items-center overflow-x-hidden relative" data-name="app" data-file="app.js">
        
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
            <a href="#donate" className="hover:text-lime transition-colors">SUPPORT US</a>
            <a href="login.html" className="bg-lime text-black px-4 py-1.5 border-2 border-black font-bold shadow-[2px_2px_0px_#ff00ff] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all ml-4">
              LOGIN
            </a>
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