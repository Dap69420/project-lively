function SpectateApp() {
  const [user, setUser] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [data, setData] = React.useState(null);
  const [activeTab, setActiveTab] = React.useState('chat');

  const params = React.useMemo(() => new URLSearchParams(window.location.search || ''), []);
  const childId = params.get('childId') || '';
  const courseId = params.get('courseId') || '';

  const loadSpectate = React.useCallback(async (parentUser, nextCourseId = courseId) => {
    if (!parentUser?.id || !childId) return;
    setLoading(true);
    setError('');

    try {
      const url = `/api/profile?mode=spectate&userId=${encodeURIComponent(parentUser.id)}&email=${encodeURIComponent(parentUser.email || '')}&childId=${encodeURIComponent(childId)}&courseId=${encodeURIComponent(nextCourseId || '')}`;
      const response = await fetch(url);
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Unable to open spectator mode.');
      }
      setData(payload.data?.spectate || null);
    } catch (error) {
      setError(error?.message || 'Unable to open spectator mode.');
    } finally {
      setLoading(false);
    }
  }, [childId, courseId]);

  React.useEffect(() => {
    if (!supabaseClient) {
      setError('Login system is not configured.');
      setLoading(false);
      return;
    }

    supabaseClient.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        window.location.href = 'login.html';
        return;
      }

      if (session.user?.user_metadata?.userType !== 'parent') {
        window.location.href = 'profile.html';
        return;
      }

      setUser(session.user);
      loadSpectate(session.user);
    });
  }, [loadSpectate]);

  const switchCourse = (nextCourseId) => {
    const url = new URL(window.location.href);
    url.searchParams.set('courseId', nextCourseId);
    window.history.replaceState({}, '', url.toString());
    loadSpectate(user, nextCourseId);
  };

  if (loading && !data) {
    return <div className="flex min-h-screen items-center justify-center bg-darkBg font-mono text-white">OPENING READ-ONLY WORKSPACE...</div>;
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-darkBg p-6 text-white">
        <div className="max-w-md rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center">
          <div className="icon-shield-alert mx-auto mb-4 text-4xl text-red-300"></div>
          <h1 className="text-2xl font-bold">Spectate blocked</h1>
          <p className="mt-3 text-sm text-red-100">{error}</p>
          <a href="profile.html" className="mt-5 inline-flex rounded-xl bg-white/10 px-4 py-2 font-mono text-xs uppercase text-white">Back to profile</a>
        </div>
      </div>
    );
  }

  const child = data?.child || {};
  const courses = data?.courses || [];
  const selectedCourse = courses.find((course) => String(course.course_id) === String(data?.selectedCourseId)) || courses[0] || null;
  const messages = data?.messages || [];
  const notes = data?.notes?.content || '';
  const childName = child.profile?.display_name || child.profile?.username || child.email || 'Child account';

  return (
    <div className="min-h-screen bg-darkBg text-white">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-darkBg/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex items-center gap-3">
            <a href="profile.html" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-gray-300 hover:text-white">
              <div className="icon-arrow-left"></div>
            </a>
            <div className="min-w-0">
              <div className="font-mono text-xs uppercase tracking-[0.25em] text-neonViolet">Read-only Spectate</div>
              <h1 className="truncate text-xl font-bold">{childName}'s Workspace</h1>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center">
            <Metric label="Level" value={child.totals?.level || 1} />
            <Metric label="XP" value={child.totals?.xp || 0} />
            <Metric label="Done" value={child.totals?.completedCourses || 0} />
            <Metric label="Streak" value={child.totals?.streak || 0} />
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl grid-cols-1 gap-4 p-4 lg:grid-cols-[18rem_minmax(0,1fr)_minmax(22rem,34rem)]">
        <aside className="rounded-2xl border border-white/10 bg-panel p-4">
          <div className="mb-3 font-mono text-xs uppercase tracking-[0.2em] text-gray-400">Courses</div>
          <div className="space-y-2">
            {courses.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-gray-500">No course activity yet.</div>
            ) : null}
            {courses.map((course) => (
              <button
                key={course.course_id}
                type="button"
                onClick={() => switchCourse(course.course_id)}
                className={`w-full rounded-xl border p-3 text-left transition-colors ${String(course.course_id) === String(data.selectedCourseId) ? 'border-neonViolet bg-neonViolet/15' : 'border-white/10 bg-black/20 hover:border-white/20'}`}
              >
                <div className="truncate text-sm font-bold">{course.title}</div>
                <div className="mt-1 truncate font-mono text-[10px] text-gray-500">{course.topic || course.subject}</div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/40">
                  <div className="h-full bg-neonViolet" style={{ width: `${course.completed ? 100 : Math.min(100, Number(course.progress_percentage || 0))}%` }}></div>
                </div>
              </button>
            ))}
          </div>
        </aside>

        <section className="rounded-2xl border border-white/10 bg-panel p-4">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="font-mono text-xs uppercase tracking-[0.2em] text-neonViolet">Workspace</div>
              <h2 className="mt-1 truncate text-2xl font-bold">{selectedCourse?.title || 'No course selected'}</h2>
              <p className="mt-1 text-sm text-gray-400">{selectedCourse?.description || selectedCourse?.topic || 'Read-only view.'}</p>
            </div>
            <span className="shrink-0 rounded-full border border-white/10 bg-black/30 px-3 py-1 font-mono text-xs text-gray-300">
              {selectedCourse?.completed ? 'Completed' : `${Number(selectedCourse?.progress_percentage || 0)}%`}
            </span>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="mb-3 font-mono text-xs uppercase tracking-[0.2em] text-gray-400">Objectives</div>
            <div className="space-y-2">
              {normalizeObjectives(selectedCourse).map((objective, index) => {
                const status = Array.isArray(selectedCourse?.stats?.objectiveStatus) ? selectedCourse.stats.objectiveStatus : [];
                const complete = Boolean(selectedCourse?.completed || status[index]);
                return (
                  <div key={`${objective}-${index}`} className="flex gap-2 rounded-lg bg-white/[0.03] px-3 py-2 font-mono text-sm">
                    <span className={complete ? 'text-green-300' : 'text-gray-500'}>{complete ? '[x]' : '[ ]'}</span>
                    <span className={complete ? 'text-gray-400 line-through' : 'text-gray-200'}>{objective}</span>
                  </div>
                );
              })}
              {normalizeObjectives(selectedCourse).length === 0 ? (
                <div className="rounded-lg bg-white/[0.03] px-3 py-2 text-sm text-gray-500">No objectives saved for this course.</div>
              ) : null}
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="font-mono text-xs uppercase tracking-[0.2em] text-gray-400">Notes</div>
              <span className="font-mono text-[10px] uppercase text-gray-600">Read only</span>
            </div>
            <pre className="min-h-48 whitespace-pre-wrap break-words rounded-xl border border-white/10 bg-[#08090d] p-4 font-mono text-sm text-gray-200">{notes || 'No notes written for this course yet.'}</pre>
          </div>
        </section>

        <section className="min-h-[70vh] rounded-2xl border border-white/10 bg-panel flex flex-col">
          <div className="flex items-center justify-between border-b border-white/10 p-4">
            <div>
              <div className="font-mono text-xs uppercase tracking-[0.2em] text-neonViolet">Buddy_AI Chat</div>
              <div className="text-sm text-gray-400">Read-only conversation log</div>
            </div>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto p-4 custom-scrollbar">
            {messages.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-gray-500">No chat messages for this course yet.</div>
            ) : null}
            {messages.map((message) => {
              const isUser = message.role === 'user';
              return (
                <div key={message.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[86%] rounded-2xl border p-3 ${isUser ? 'border-blue-400/30 bg-blue-500/20' : 'border-white/10 bg-black/30'}`}>
                    <div className="mb-1 font-mono text-[10px] uppercase tracking-wider text-gray-500">{isUser ? 'Student' : 'Buddy_AI'}</div>
                    <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{message.text}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="border-t border-white/10 p-4">
            <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-3 font-mono text-xs uppercase tracking-wider text-yellow-200">
              Spectator mode: parents can view, not edit or send.
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function normalizeObjectives(course) {
  if (!course) return [];
  if (Array.isArray(course.objectives)) return course.objectives;
  if (typeof course.objectives === 'string') {
    try {
      const parsed = JSON.parse(course.objectives);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_error) {
      return [];
    }
  }
  return [];
}

function Metric({ label, value }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2">
      <div className="font-mono text-[10px] uppercase text-gray-500">{label}</div>
      <div className="font-bold text-white">{value}</div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<SpectateApp />);
