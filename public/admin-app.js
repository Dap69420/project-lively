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
            <h1 className="text-2xl mb-4 text-red-400">Admin Panel Error</h1>
            <p className="mb-6 font-mono text-sm text-gray-400">{this.state.error?.message}</p>
            <button onClick={() => window.location.reload()} className="px-6 py-2 bg-neonViolet text-black rounded-lg font-bold hover:shadow-[0_0_15px_rgba(176,38,255,0.4)] transition-all">Reload Page</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function AdminApp() {
  try {
    const [allCourses, setAllCourses] = React.useState([]);
    const [loadingCourses, setLoadingCourses] = React.useState(true);

    React.useEffect(() => {
      // Load all courses
      fetch('/api/courses')
        .then(r => r.json())
        .then(result => {
          if (result.success) {
            setAllCourses(result.data);
          }
        })
        .catch(err => console.error('Failed to load courses:', err))
        .finally(() => setLoadingCourses(false));
    }, []);

    const handleCourseCreated = (newCourse) => {
      setAllCourses([newCourse, ...allCourses]);
    };

    return (
      <div className="min-h-screen bg-darkBg text-white relative overflow-hidden">
        {/* Animated background glow */}
        <div className="fixed top-0 left-0 w-[500px] h-[500px] bg-neonViolet rounded-full mix-blend-screen filter blur-3xl opacity-10 pointer-events-none animate-pulse"></div>
        <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-blue-600 rounded-full mix-blend-screen filter blur-3xl opacity-5 pointer-events-none animate-pulse" style={{animationDelay: '2s'}}></div>

        <div className="relative z-10 p-8">
          <div className="max-w-7xl mx-auto">
            
            {/* Header */}
            <div className="mb-12">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-neonViolet rounded-lg flex items-center justify-center shadow-[0_0_20px_rgba(176,38,255,0.4)]">
                  <span className="text-black font-black text-xl">⚙</span>
                </div>
                <div>
                  <h1 className="text-4xl font-black tracking-tight">
                    <span className="text-white">ADMIN</span>
                    <span className="text-neonViolet"> PANEL</span>
                  </h1>
                  <p className="text-gray-400 font-mono text-sm mt-1">Manage courses and learning paths</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Course Form */}
              <div className="lg:col-span-2">
                <CourseForm 
                  adminKey="lively_admin_sk_7x9k2m0pq5r8v1w3y6z"
                  onSuccess={handleCourseCreated}
                />
              </div>

              {/* Courses List Sidebar */}
              <div className="lg:col-span-1">
                <div className="glass-panel p-6 sticky top-8">
                  <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <span className="text-neonViolet">📚</span> Active Courses
                  </h2>
                  
                  {loadingCourses ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="h-16 bg-white/5 rounded-lg animate-pulse"></div>
                      ))}
                    </div>
                  ) : allCourses.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <p className="font-mono text-sm">No courses yet</p>
                      <p className="text-xs mt-2">Create one using the form →</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {allCourses.map(course => (
                        <div key={course.id} className="p-3 rounded-lg bg-black/20 border border-white/10 hover:border-neonViolet/50 transition-colors">
                          <div className="font-mono text-xs text-neonViolet uppercase tracking-wider mb-1">
                            {course.subject} • Grade {course.grade}
                          </div>
                          <div className="font-semibold text-sm truncate">{course.title}</div>
                          <div className="text-xs text-gray-400 mt-2 flex gap-2">
                            <span>🎯 {course.completion_xp} XP</span>
                            <span>💰 {course.completion_coins} Coins</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-6 pt-6 border-t border-white/10 text-xs text-gray-400 font-mono">
                    <p className="mb-2">Total Courses: <span className="text-neonViolet">{allCourses.length}</span></p>
                    <p className="text-[10px]">Refresh page to see latest courses</p>
                  </div>
                </div>
              </div>

            </div>

            {/* Info Footer */}
            <div className="mt-12 pt-8 border-t border-white/10">
              <div className="glass-panel p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <h3 className="font-bold mb-2 flex items-center gap-2">
                      <span className="text-green-400">✓</span> Database-Backed
                    </h3>
                    <p className="text-sm text-gray-400">All courses saved to Neon PostgreSQL</p>
                  </div>
                  <div>
                    <h3 className="font-bold mb-2 flex items-center gap-2">
                      <span className="text-blue-400">✓</span> AI Customizable
                    </h3>
                    <p className="text-sm text-gray-400">Set custom AI prompts per course</p>
                  </div>
                  <div>
                    <h3 className="font-bold mb-2 flex items-center gap-2">
                      <span className="text-purple-400">✓</span> No Redeployment
                    </h3>
                    <p className="text-sm text-gray-400">Add courses instantly without code changes</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error('AdminApp component error:', error);
    return (
      <div className="min-h-screen flex items-center justify-center bg-darkBg text-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4 text-red-400">App Error</h1>
          <p className="text-gray-400 mb-6">{error?.message}</p>
          <button onClick={() => location.reload()} className="px-6 py-2 bg-neonViolet text-black rounded-lg font-bold">Reload</button>
        </div>
      </div>
    );
  }
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <ErrorBoundary>
    <AdminApp />
  </ErrorBoundary>
);
