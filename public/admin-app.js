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
    const supabaseClient = window.supabaseClient || null;
    const adminAllowlist = Array.isArray(window.__APP_CONFIG__?.ADMIN_ALLOWED_EMAILS) ? window.__APP_CONFIG__.ADMIN_ALLOWED_EMAILS : [];
    const [allCourses, setAllCourses] = React.useState([]);
    const [loadingCourses, setLoadingCourses] = React.useState(true);
    const [session, setSession] = React.useState(null);
    const [authLoading, setAuthLoading] = React.useState(true);
    const [accessDenied, setAccessDenied] = React.useState('');
    const [designMode, setDesignMode] = React.useState('glass');
    const [editingCourse, setEditingCourse] = React.useState(null);
    const [deletingCourseId, setDeletingCourseId] = React.useState('');
    const [courseActionError, setCourseActionError] = React.useState('');
    const [activeAdminTab, setActiveAdminTab] = React.useState('courses');
    const [achievements, setAchievements] = React.useState([]);
    const [achievementForm, setAchievementForm] = React.useState({
      name: '',
      description: '',
      icon: 'icon-award',
      color: 'from-purple-500 to-neonViolet',
      condition_type: 'total_xp',
      condition_value: 25,
      sort_index: 100
    });
    const [achievementError, setAchievementError] = React.useState('');

    React.useEffect(() => {
      let mounted = true;

      if (!supabaseClient) {
        setAccessDenied('Authentication is unavailable.');
        setAuthLoading(false);
        return;
      }

      supabaseClient.auth.getSession().then(({ data: { session } }) => {
        if (!mounted) return;
        setSession(session || null);
        setAuthLoading(false);
        if (!session) {
          setAccessDenied('Please sign in to access the admin panel.');
        }
      });

      return () => {
        mounted = false;
      };
    }, []);

    const fetchJson = async (url, options) => {
      const response = await fetch(url, options);
      const text = await response.text();
      let payload = null;

      try {
        payload = text ? JSON.parse(text) : {};
      } catch (_error) {
        payload = { success: false, error: text || `Request failed with status ${response.status}` };
      }

      if (!response.ok) {
        const error = new Error(payload?.error || `Request failed with status ${response.status}`);
        error.payload = payload;
        error.status = response.status;
        throw error;
      }

      return payload;
    };

    React.useEffect(() => {
      if (!session?.access_token) {
        setLoadingCourses(false);
        return;
      }

      const sessionEmail = String(session?.user?.email || '').toLowerCase();
      const allowlist = adminAllowlist.map((email) => String(email).toLowerCase());
      if (allowlist.length > 0 && (!sessionEmail || !allowlist.includes(sessionEmail))) {
        setAccessDenied('Your account is not authorized to access this page.');
        setLoadingCourses(false);
        return;
      }

      // Load all courses
      fetchJson('/api/admin/courses', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })
        .then((result) => {
          if (result.success) {
            setAllCourses(result.data || []);
          }
        })
        .catch((err) => {
          console.error('Failed to load courses:', err);
          setAccessDenied(err.status === 403 ? 'Your account is not authorized to access the admin panel.' : (err.message || 'Failed to load courses'));
        })
        .finally(() => setLoadingCourses(false));

      fetchJson('/api/admin/achievements', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })
        .then((result) => setAchievements(result.data || []))
        .catch((err) => setAchievementError(err.message || 'Failed to load achievements'));
    }, [session]);

    const handleCourseCreated = (newCourse) => {
      if (!newCourse) return;
      setAllCourses((currentCourses) => {
        const exists = currentCourses.some((course) => course.id === newCourse.id);
        if (exists) {
          return currentCourses.map((course) => course.id === newCourse.id ? newCourse : course);
        }
        return [newCourse, ...currentCourses];
      });
      setEditingCourse(null);
      setCourseActionError('');
    };

    const handleEditCourse = (course) => {
      setEditingCourse(course);
      setCourseActionError('');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDeleteCourse = async (course) => {
      if (!course?.id || !session?.access_token) return;

      const confirmed = window.confirm(`Delete "${course.title}" from active courses? Students will no longer see it.`);
      if (!confirmed) return;

      setDeletingCourseId(course.id);
      setCourseActionError('');

      try {
        await fetchJson('/api/admin/courses', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ courseId: course.id }),
        });

        setAllCourses((currentCourses) => currentCourses.filter((item) => item.id !== course.id));
        if (editingCourse?.id === course.id) {
          setEditingCourse(null);
        }
      } catch (error) {
        console.error('Failed to delete course:', error);
        setCourseActionError(error?.message || 'Failed to delete course');
      } finally {
        setDeletingCourseId('');
      }
    };

    const conditionLabels = {
      total_xp: 'Earn total XP',
      level: 'Reach level',
      streak: 'Reach streak days',
      coins: 'Collect coins',
      correct_answers: 'Get correct answers',
      courses_completed: 'Complete courses'
    };

    const describeAchievement = (achievement) => {
      const label = conditionLabels[achievement.condition_type] || achievement.condition_type;
      return `${label}: ${achievement.condition_value}`;
    };

    const handleAchievementSubmit = async (event) => {
      event.preventDefault();
      if (!session?.access_token) return;

      setAchievementError('');
      try {
        const result = await fetchJson('/api/admin/achievements', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(achievementForm),
        });
        setAchievements((current) => [...current, result.data].sort((a, b) => Number(a.sort_index || 0) - Number(b.sort_index || 0)));
        setAchievementForm({
          name: '',
          description: '',
          icon: 'icon-award',
          color: 'from-purple-500 to-neonViolet',
          condition_type: 'total_xp',
          condition_value: 25,
          sort_index: 100
        });
      } catch (error) {
        setAchievementError(error?.message || 'Failed to save achievement');
      }
    };

    const handleDeleteAchievement = async (achievement) => {
      if (!achievement?.id || !session?.access_token) return;
      const confirmed = window.confirm(`Delete achievement "${achievement.name}"?`);
      if (!confirmed) return;

      try {
        await fetchJson('/api/admin/achievements', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ id: achievement.id }),
        });
        setAchievements((current) => current.filter((item) => item.id !== achievement.id));
      } catch (error) {
        setAchievementError(error?.message || 'Failed to delete achievement');
      }
    };

    if (authLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-darkBg text-white">
          <div className="glass-panel p-8 font-mono text-sm text-gray-400">Checking admin access...</div>
        </div>
      );
    }

    if (!session) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-darkBg text-white p-6">
          <div className="glass-panel max-w-md p-8 text-center">
            <h1 className="text-3xl font-black mb-3 text-red-400">Access denied</h1>
            <p className="text-sm text-gray-400 font-mono mb-6">{accessDenied || 'Your account is not authorized to open this panel.'}</p>
            <div className="flex items-center justify-center gap-3">
              <a href="profile.html" className="px-5 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">Go to profile</a>
              <a href="login.html" className="px-5 py-2 rounded-lg bg-neonViolet text-black font-bold hover:opacity-90 transition-opacity">Sign in</a>
            </div>
          </div>
        </div>
      );
    }

    const sessionEmail = String(session?.user?.email || '').toLowerCase();
    const normalizedAllowlist = adminAllowlist.map((email) => String(email).toLowerCase());
    const isAdmin = normalizedAllowlist.length === 0 ? true : normalizedAllowlist.includes(sessionEmail);

    if (!isAdmin) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-darkBg text-white p-6">
          <div className="glass-panel max-w-md p-8 text-center">
            <h1 className="text-3xl font-black mb-3 text-red-400">Admin access required</h1>
            <p className="text-sm text-gray-400 font-mono mb-6">{accessDenied || 'This page is restricted to admins only.'}</p>
            <a href="profile.html" className="inline-flex px-5 py-2 rounded-lg bg-neonViolet text-black font-bold hover:opacity-90 transition-opacity">Back to profile</a>
          </div>
        </div>
      );
    }

    return (
      <div className={`min-h-screen bg-darkBg text-white relative overflow-hidden theme-${designMode}`}>
        {/* Animated background glow */}
        <div className="fixed top-0 left-0 w-[500px] h-[500px] bg-neonViolet rounded-full mix-blend-screen filter blur-3xl opacity-10 pointer-events-none animate-pulse"></div>
        <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-blue-600 rounded-full mix-blend-screen filter blur-3xl opacity-5 pointer-events-none animate-pulse" style={{animationDelay: '2s'}}></div>

        <div className="relative z-10 p-8">
          <div className="max-w-7xl mx-auto">
            
            {/* Header */}
            <div className="mb-12">
              <div className="flex items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-4">
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
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDesignMode('glass')}
                    className={`px-3 py-2 text-xs font-mono uppercase tracking-wider rounded border transition-colors ${designMode === 'glass' ? 'bg-neonViolet text-black border-neonViolet' : 'bg-black/30 text-gray-300 border-white/20'}`}
                  >
                    Glass
                  </button>
                  <button
                    type="button"
                    onClick={() => setDesignMode('brutal')}
                    className={`px-3 py-2 text-xs font-mono uppercase tracking-wider rounded border transition-colors ${designMode === 'brutal' ? 'bg-neonViolet text-black border-neonViolet' : 'bg-black/30 text-gray-300 border-white/20'}`}
                  >
                    Brutal
                  </button>
                </div>
              </div>
            </div>

            <div className="mb-8 flex gap-3">
              <button
                type="button"
                onClick={() => setActiveAdminTab('courses')}
                className={`rounded-lg border px-4 py-2 font-mono text-xs uppercase tracking-wider ${activeAdminTab === 'courses' ? 'border-neonViolet bg-neonViolet text-black' : 'border-white/10 bg-white/5 text-gray-300'}`}
              >
                Courses
              </button>
              <button
                type="button"
                onClick={() => setActiveAdminTab('achievements')}
                className={`rounded-lg border px-4 py-2 font-mono text-xs uppercase tracking-wider ${activeAdminTab === 'achievements' ? 'border-neonViolet bg-neonViolet text-black' : 'border-white/10 bg-white/5 text-gray-300'}`}
              >
                Achievements
              </button>
            </div>

            {activeAdminTab === 'courses' ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Course Form */}
              <div className="lg:col-span-2">
                <CourseForm 
                  accessToken={session?.access_token || ''}
                  editingCourse={editingCourse}
                  onCancelEdit={() => setEditingCourse(null)}
                  onSuccess={handleCourseCreated}
                />
              </div>

              {/* Courses List Sidebar */}
              <div className="lg:col-span-1">
                <div className="glass-panel p-6 sticky top-8">
                  <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <span className="text-neonViolet">📚</span> Active Courses
                  </h2>
                  
                  {courseActionError ? (
                    <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono">
                      {courseActionError}
                    </div>
                  ) : null}

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
                          <div className="mt-3 grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => handleEditCourse(course)}
                              className="px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-gray-200 font-mono text-[11px] uppercase tracking-wider hover:bg-white/20 transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteCourse(course)}
                              disabled={deletingCourseId === course.id}
                              className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 font-mono text-[11px] uppercase tracking-wider hover:bg-red-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {deletingCourseId === course.id ? 'Deleting' : 'Delete'}
                            </button>
                          </div>
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
            ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1">
                <form onSubmit={handleAchievementSubmit} className="glass-panel p-6 space-y-4">
                  <h2 className="text-xl font-bold">Add Achievement</h2>
                  {achievementError ? (
                    <div className="rounded border border-red-500/30 bg-red-500/10 p-3 text-xs font-mono text-red-300">{achievementError}</div>
                  ) : null}
                  <input
                    value={achievementForm.name}
                    onChange={(event) => setAchievementForm((current) => Object.assign({}, current, { name: event.target.value }))}
                    placeholder="Achievement name"
                    className="w-full rounded border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-neonViolet"
                  />
                  <textarea
                    value={achievementForm.description}
                    onChange={(event) => setAchievementForm((current) => Object.assign({}, current, { description: event.target.value }))}
                    placeholder="How it is achieved"
                    className="min-h-20 w-full rounded border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-neonViolet"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      value={achievementForm.icon}
                      onChange={(event) => setAchievementForm((current) => Object.assign({}, current, { icon: event.target.value }))}
                      placeholder="icon-award"
                      className="rounded border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-neonViolet"
                    />
                    <input
                      value={achievementForm.color}
                      onChange={(event) => setAchievementForm((current) => Object.assign({}, current, { color: event.target.value }))}
                      placeholder="from-purple-500 to-neonViolet"
                      className="rounded border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-neonViolet"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <select
                      value={achievementForm.condition_type}
                      onChange={(event) => setAchievementForm((current) => Object.assign({}, current, { condition_type: event.target.value }))}
                      className="rounded border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-neonViolet"
                    >
                      {Object.entries(conditionLabels).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="1"
                      value={achievementForm.condition_value}
                      onChange={(event) => setAchievementForm((current) => Object.assign({}, current, { condition_value: Number(event.target.value || 1) }))}
                      className="rounded border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-neonViolet"
                    />
                  </div>
                  <input
                    type="number"
                    value={achievementForm.sort_index}
                    onChange={(event) => setAchievementForm((current) => Object.assign({}, current, { sort_index: Number(event.target.value || 0) }))}
                    placeholder="Index"
                    className="w-full rounded border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-neonViolet"
                  />
                  <button className="w-full rounded bg-neonViolet px-4 py-2 font-bold text-black hover:opacity-90">
                    Add Achievement
                  </button>
                </form>
              </div>
              <div className="lg:col-span-2">
                <div className="glass-panel p-6">
                  <h2 className="mb-4 text-xl font-bold">Achievement Index</h2>
                  <div className="space-y-3">
                    {achievements.map((achievement) => (
                      <div key={achievement.id} className="rounded-lg border border-white/10 bg-black/20 p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="font-mono text-[10px] uppercase tracking-wider text-neonViolet">#{achievement.sort_index} • {achievement.id}</div>
                            <div className="mt-1 text-lg font-bold">{achievement.name}</div>
                            <div className="mt-1 text-sm text-gray-400">{achievement.description}</div>
                            <div className="mt-2 text-xs font-mono text-gray-300">Achieved by: {describeAchievement(achievement)}</div>
                          </div>
                          <div className="text-right">
                            <div className="rounded border border-green-400/30 bg-green-400/10 px-3 py-1 text-xs font-mono text-green-300">
                              {achievement.owner_count || 0} users own it
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteAchievement(achievement)}
                              className="mt-3 rounded border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-mono text-red-300 hover:bg-red-500/20"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {achievements.length === 0 ? (
                      <div className="rounded border border-white/10 bg-black/20 p-6 text-center text-sm text-gray-400">No achievements yet.</div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
            )}

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
