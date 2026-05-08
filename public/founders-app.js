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
        <div className="min-h-screen flex items-center justify-center p-8">
          <div className="brutal-card text-center">
            <h1 className="text-4xl mb-4 text-hotpink">Lab Malfunction</h1>
            <p className="mb-6 font-mono">Something broke in the lab.</p>
            <button onClick={() => window.location.reload()} className="brutal-btn-lime">Restart Lab</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function FoundersApp() {
  try {
    return (
      <div className="flex-grow flex flex-col items-center p-6 relative overflow-hidden" data-name="founders-app" data-file="founders-app.js">
        
        {/* Background glow effects */}
        <div className="bg-glow fixed top-[-20%] left-[-10%] w-[50%] h-[50%] bg-neonViolet rounded-full mix-blend-screen filter blur-[120px] opacity-20 pointer-events-none z-0"></div>
        <div className="bg-glow fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-600 rounded-full mix-blend-screen filter blur-[120px] opacity-10 pointer-events-none z-0"></div>

        <a href="index.html" className="absolute top-6 left-6 flex items-center gap-2 text-white hover:text-lime transition-colors font-mono font-bold group relative z-10">
          <div className="icon-arrow-left transform group-hover:-translate-x-1 transition-transform"></div> BACK TO BASE
        </a>

        <div className="w-full max-w-4xl relative z-10 mt-16 space-y-16 pb-12">
          
          <header className="text-center">
            <div className="inline-flex items-center gap-2 bg-black text-lime px-3 py-1 font-mono text-sm font-bold border-2 border-white mb-6 uppercase">
              <div className="icon-flask-conical"></div> Founder's Lab
            </div>
            <TheStory />
          </header>

          <TheVision />
          
          <SupportCard />
          
          <ContactGrid />

          <footer className="text-center pt-8 border-t-2 border-white/10">
            <p className="font-mono text-sm text-gray-400">
              Note: This is a 100% independent project. Your support goes directly to server uptime.
            </p>
          </footer>

        </div>
        
        <ThemeToggle />
      </div>
    );
  } catch (error) {
    console.error('FoundersApp component error:', error);
    return null;
  }
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <ErrorBoundary>
    <FoundersApp />
  </ErrorBoundary>
);