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
    const [user, setUser] = React.useState(null);
    const [loading, setLoading] = React.useState(true);
    const [activeTab, setActiveTab] = React.useState('chat');
    const requestedCourseId = React.useMemo(() => {
      const params = new URLSearchParams(window.location.search || '');
      return params.get('courseId') || '';
    }, []);

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

      const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((_event, session) => {
        if (!session) window.location.href = 'login.html';
        else setUser(session.user);
      });

      return () => subscription.unsubscribe();
    }, []);

    React.useEffect(() => {
      if (user && window.LivelyProgress?.setUserContext) {
        window.LivelyProgress.setUserContext(user).then(async () => {
          if (requestedCourseId && window.LivelyProgress?.setSelectedCourse) {
            const snapshot = window.LivelyProgress.getSnapshot ? window.LivelyProgress.getSnapshot() : null;
            const hasCourse = Array.isArray(snapshot?.availableCourses) && snapshot.availableCourses.some((course) => course.id === requestedCourseId);

            if (!hasCourse) {
              try {
                const response = await fetch(`/api/courses?id=${encodeURIComponent(requestedCourseId)}`);
                const text = await response.text();
                const payload = text ? JSON.parse(text) : {};

                if (response.ok && payload?.success && payload?.data) {
                  window.LivelyProgress.setAvailableCourses([payload.data]);
                }
              } catch (error) {
                console.error('Failed to load requested course:', error);
              }
            }

            window.LivelyProgress.setSelectedCourse(requestedCourseId);
          }
        }).catch((error) => {
          console.error('Failed to hydrate workspace state:', error);
        });
      }

      window.LivelyWorkspace = {
        switchToChat: () => setActiveTab('chat')
      };
      return () => {
        if (window.LivelyWorkspace) {
          delete window.LivelyWorkspace;
        }
      };
    }, [user, requestedCourseId]);

    if (loading) return <div className="h-screen flex items-center justify-center bg-discordDarkest text-white font-mono">LOADING WORKSPACE...</div>;

    return (
      <div className="h-screen w-full flex flex-col bg-discordDarkest relative overflow-hidden" data-name="workspace-app" data-file="workspace-app.js">
        {/* Background glow effects */}
        <div className="bg-glow fixed top-[-20%] left-[-10%] w-[50%] h-[50%] bg-neonViolet rounded-full mix-blend-screen filter blur-[120px] opacity-20 pointer-events-none z-0"></div>
        <div className="bg-glow fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-600 rounded-full mix-blend-screen filter blur-[120px] opacity-10 pointer-events-none z-0"></div>
        
        <div className="relative z-10 flex flex-col h-full w-full">
          <Header user={user} />
          
          <main className="flex-1 flex overflow-hidden">
            <Sidebar user={user} />
            
            <div className="flex-1 flex flex-col" style={{ minWidth: 0 }}>
              {/* Tab Navigation */}
              <div className="flex gap-2 p-3 bg-discordDarker border-b border-gray-700 z-20">
                <button
                  onClick={() => setActiveTab('chat')}
                  className={`px-4 py-2 rounded font-mono text-sm font-bold transition-all ${
                    activeTab === 'chat'
                      ? 'bg-mcGreen text-black'
                      : 'bg-discordDarkest text-gray-300 hover:text-white border border-gray-700'
                  }`}
                >
                  💬 AI Chat
                </button>
                <button
                  onClick={() => setActiveTab('sketch')}
                  className={`px-4 py-2 rounded font-mono text-sm font-bold transition-all ${
                    activeTab === 'sketch'
                      ? 'bg-mcGreen text-black'
                      : 'bg-discordDarkest text-gray-300 hover:text-white border border-gray-700'
                  }`}
                >
                  ✏️ Sketch
                </button>
              </div>

              {/* Tab Content */}
              <div className="flex-1 flex overflow-hidden">
                {activeTab === 'chat' && (
                  <div className="flex-1 flex">
                    <MissionCard />
                    <AIChat user={user} />
                  </div>
                )}
                {activeTab === 'sketch' && (
                  <Sketch user={user} />
                )}
              </div>
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
