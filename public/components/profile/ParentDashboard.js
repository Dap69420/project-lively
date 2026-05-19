function useFamilyLinks(user) {
  const [state, setState] = React.useState({
    loading: true,
    saving: false,
    error: '',
    notice: '',
    family: { parentLinks: [], childLinks: [], children: [], limits: { maxChildren: 3, usedChildren: 0 } }
  });

  const loadFamily = React.useCallback(async () => {
    if (!user?.id) return;
    setState((current) => Object.assign({}, current, { loading: true, error: '' }));

    try {
      const response = await fetch(`/api/profile?mode=family&userId=${encodeURIComponent(user.id)}&email=${encodeURIComponent(user.email || '')}`);
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to load family links.');
      }

      setState((current) => Object.assign({}, current, {
        loading: false,
        family: payload.data?.family || current.family
      }));
    } catch (error) {
      setState((current) => Object.assign({}, current, {
        loading: false,
        error: error?.message || 'Failed to load family links.'
      }));
    }
  }, [user?.id, user?.email]);

  const runAction = React.useCallback(async (body, successMessage) => {
    if (!user?.id) return;
    setState((current) => Object.assign({}, current, { saving: true, error: '', notice: '' }));

    try {
      const response = await fetch(`/api/profile?mode=family&userId=${encodeURIComponent(user.id)}&email=${encodeURIComponent(user.email || '')}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Family action failed.');
      }

      setState((current) => Object.assign({}, current, { saving: false, notice: successMessage || 'Saved.' }));
      await loadFamily();
    } catch (error) {
      setState((current) => Object.assign({}, current, {
        saving: false,
        error: error?.message || 'Family action failed.'
      }));
    }
  }, [user?.id, user?.email, loadFamily]);

  const runClassroomAction = React.useCallback(async (body, successMessage) => {
    if (!user?.id) return;
    setState((current) => Object.assign({}, current, { saving: true, error: '', notice: '' }));

    try {
      const response = await fetch(`/api/profile?mode=classroom&userId=${encodeURIComponent(user.id)}&email=${encodeURIComponent(user.email || '')}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Classroom action failed.');
      }

      setState((current) => Object.assign({}, current, { saving: false, notice: successMessage || 'Saved.' }));
      await loadFamily();
    } catch (error) {
      setState((current) => Object.assign({}, current, {
        saving: false,
        error: error?.message || 'Classroom action failed.'
      }));
    }
  }, [user?.id, user?.email, loadFamily]);

  React.useEffect(() => {
    loadFamily();
  }, [loadFamily]);

  return { state, loadFamily, runAction, runClassroomAction };
}

function ParentDashboard({ user }) {
  try {
    const { state, runAction, runClassroomAction } = useFamilyLinks(user);
    const [childEmail, setChildEmail] = React.useState('');
    const [selectedChild, setSelectedChild] = React.useState(null);
    const [detailTab, setDetailTab] = React.useState('courses');
    const [joinCodes, setJoinCodes] = React.useState({});
    const parentLinks = state.family?.parentLinks || [];
    const children = state.family?.children || [];
    const limit = state.family?.limits || { maxChildren: 3, usedChildren: parentLinks.length };
    const remaining = Math.max(0, Number(limit.maxChildren || 3) - Number(limit.usedChildren || 0));
    const handleLogout = async () => {
      if (supabaseClient) {
        await supabaseClient.auth.signOut();
      }
      window.location.href = 'index.html';
    };

    const addChild = async (event) => {
      event.preventDefault();
      await runAction({ action: 'add_child', childEmail }, 'Child invite created. They can accept it from their profile.');
      setChildEmail('');
    };

    return (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-8 min-w-0">
        <section className="lg:col-span-5 glass-panel p-4 sm:p-6 min-w-0">
          <div className="mb-6 flex items-start justify-between gap-3">
            <div>
              <div className="font-mono text-xs uppercase tracking-[0.25em] text-neonViolet">Parent Mode</div>
              <h2 className="mt-2 text-2xl font-bold text-white">Family Control Center</h2>
              <p className="mt-2 text-sm text-gray-400">Connect up to 3 child accounts and watch their course progress here.</p>
            </div>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-neonViolet/40 bg-neonViolet/15 text-neonViolet">
              <div className="icon-shield-check text-2xl"></div>
            </div>
          </div>

          <div className="mb-5 rounded-xl border border-red-500/20 bg-red-500/10 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="font-mono text-xs uppercase tracking-wider text-red-300">Parent Session</div>
                <p className="mt-1 text-sm text-gray-400">Sign out of this parent account when you are done checking progress.</p>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="shrink-0 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 font-mono text-xs font-bold uppercase text-red-300 hover:bg-red-500/20"
              >
                Logout
              </button>
            </div>
          </div>

          {state.error ? (
            <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300 font-mono">{state.error}</div>
          ) : null}
          {state.notice ? (
            <div className="mb-4 rounded-xl border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-300 font-mono">{state.notice}</div>
          ) : null}

          <form onSubmit={addChild} className="space-y-3">
            <label className="font-mono text-xs uppercase tracking-widest text-gray-400">Child email</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="email"
                value={childEmail}
                onChange={(event) => setChildEmail(event.target.value)}
                placeholder="child@email.com"
                disabled={remaining <= 0 || state.saving}
                className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-neonViolet"
              />
              <button
                type="submit"
                disabled={remaining <= 0 || state.saving || !childEmail.trim()}
                className="rounded-xl bg-neonViolet px-5 py-3 font-mono text-sm font-bold uppercase text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Add Child
              </button>
            </div>
            <p className="text-xs text-gray-500 font-mono">{remaining} child slot{remaining === 1 ? '' : 's'} left. The child must log in with that separate email and accept the link.</p>
          </form>

          <div className="mt-6 space-y-3">
            {state.loading ? (
              <div className="h-24 rounded-xl border border-white/10 bg-black/20 animate-pulse"></div>
            ) : null}
            {!state.loading && parentLinks.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-gray-400 font-mono">No child accounts linked yet.</div>
            ) : null}
            {parentLinks.map((link) => (
              <div key={link.id} className="rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-bold text-white">{link.child_email}</div>
                    <div className="mt-1 font-mono text-xs uppercase text-gray-500">{link.status}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => runAction({ action: 'remove_child', linkId: link.id }, 'Child link removed.')}
                    disabled={state.saving}
                    className="rounded-lg border border-red-500/30 px-3 py-2 text-xs font-mono uppercase text-red-300 hover:bg-red-500/10"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="lg:col-span-7 glass-panel p-4 sm:p-6 min-w-0">
          <div className="mb-6 flex items-center justify-between gap-3">
            <div>
              <div className="font-mono text-xs uppercase tracking-[0.25em] text-neonViolet">Child Progress</div>
              <h2 className="mt-2 text-2xl font-bold text-white">Learning Reports</h2>
            </div>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono text-xs text-gray-400">{children.length}/3 connected</span>
          </div>

          {children.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-black/20 p-6 text-sm text-gray-400">
              Accepted child accounts will appear here with level, XP, streak, completed courses, and recent course progress.
            </div>
          ) : null}

          <div className="space-y-4">
            {children.map((link) => {
              const progress = link.progress || {};
              const childProfile = progress.profile || {};
              const totals = progress.totals || {};
              const displayName = childProfile.display_name || childProfile.username || link.child_email;

              return (
                <article key={link.id} className="rounded-2xl border border-white/10 bg-black/20 p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="min-w-0 flex items-center gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-neonViolet/15">
                        {childProfile.avatar_url ? (
                          <img src={childProfile.avatar_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="icon-user text-xl text-neonViolet"></div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate text-lg font-bold text-white">{displayName}</h3>
                        <p className="truncate font-mono text-xs text-gray-500">{link.child_email}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <Metric label="LVL" value={totals.level || 1} />
                      <Metric label="XP" value={totals.xp || 0} />
                      <Metric label="Done" value={totals.completedCourses || 0} />
                      <Metric label="Streak" value={totals.streak || 0} />
                    </div>
                  </div>

                  <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                    <div className="min-w-0 text-sm text-gray-400">
                      <span className="text-white font-bold">{totals.startedCourses || 0}</span> started courses,
                      {' '}<span className="text-white font-bold">{totals.coins || 0}</span> coins earned.
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <a
                        href={`spectate.html?childId=${encodeURIComponent(link.child_id || '')}`}
                        className="rounded-lg border border-neonViolet/40 bg-neonViolet/10 px-4 py-2 text-xs font-mono font-bold uppercase text-neonViolet hover:bg-neonViolet/20"
                      >
                        Spectate Workspace
                      </a>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedChild(link);
                          setDetailTab('courses');
                        }}
                        className="rounded-lg bg-neonViolet px-4 py-2 text-xs font-mono font-bold uppercase text-white hover:brightness-110"
                      >
                        Show More
                      </button>
                    </div>
                  </div>
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      runClassroomAction({
                        action: 'parent_add_child',
                        childId: link.child_id,
                        joinCode: joinCodes[link.id] || ''
                      }, 'Child joined classroom.');
                      setJoinCodes((current) => Object.assign({}, current, { [link.id]: '' }));
                    }}
                    className="mt-3 flex flex-col sm:flex-row gap-2"
                  >
                    <input
                      value={joinCodes[link.id] || ''}
                      onChange={(event) => setJoinCodes((current) => Object.assign({}, current, { [link.id]: event.target.value.toUpperCase() }))}
                      placeholder="Force join classroom code"
                      className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-4 py-2 font-mono text-sm text-white outline-none focus:border-neonViolet"
                    />
                    <button
                      type="submit"
                      disabled={state.saving || !String(joinCodes[link.id] || '').trim()}
                      className="rounded-xl border border-neonViolet/40 bg-neonViolet/10 px-4 py-2 font-mono text-xs font-bold uppercase text-neonViolet disabled:opacity-50"
                    >
                      Add to Class
                    </button>
                  </form>
                </article>
              );
            })}
          </div>
        </section>

        {selectedChild ? (
          <ChildDetailModal
            child={selectedChild}
            activeTab={detailTab}
            setActiveTab={setDetailTab}
            onClose={() => setSelectedChild(null)}
          />
        ) : null}
      </div>
    );
  } catch (error) {
    console.error('ParentDashboard error:', error);
    return null;
  }
}

function Metric({ label, value }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2">
      <div className="font-mono text-[10px] uppercase text-gray-500">{label}</div>
      <div className="font-bold text-white">{value}</div>
    </div>
  );
}

function ChildDetailModal({ child, activeTab, setActiveTab, onClose }) {
  const progress = child.progress || {};
  const childProfile = progress.profile || {};
  const totals = progress.totals || {};
  const courses = progress.courses || [];
  const achievements = progress.achievements || [];
  const chats = progress.chats || [];
  const displayName = childProfile.display_name || childProfile.username || child.child_email;

  const tabs = [
    { id: 'courses', label: 'Courses', count: courses.length },
    { id: 'achievements', label: 'Achievements', count: achievements.length },
    { id: 'chats', label: 'AI Chats', count: chats.length }
  ];

  return ReactDOM.createPortal((
    <div className="fixed inset-0 z-[10000] bg-black/75 backdrop-blur-sm" onClick={onClose}>
      <div className="absolute left-1/2 top-1/2 w-[min(94vw,68rem)] max-h-[86vh] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-white/10 bg-darkBg shadow-[0_20px_70px_rgba(0,0,0,0.6)]" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 border-b border-white/10 p-4 sm:p-5">
          <div className="min-w-0 flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-neonViolet/15">
              {childProfile.avatar_url ? (
                <img src={childProfile.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="icon-user text-xl text-neonViolet"></div>
              )}
            </div>
            <div className="min-w-0">
              <div className="font-mono text-xs uppercase tracking-[0.25em] text-neonViolet">Child Report</div>
              <h2 className="truncate text-xl sm:text-2xl font-bold text-white">{displayName}</h2>
              <p className="truncate font-mono text-xs text-gray-500">{child.child_email}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <a
              href={`spectate.html?childId=${encodeURIComponent(child.child_id || '')}`}
              className="hidden sm:inline-flex rounded-lg border border-neonViolet/40 bg-neonViolet/10 px-3 py-2 font-mono text-xs uppercase text-neonViolet hover:bg-neonViolet/20"
            >
              Spectate
            </a>
            <button type="button" onClick={onClose} className="rounded-lg bg-white/10 p-3 text-gray-300 hover:text-white">
              <div className="icon-x"></div>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 border-b border-white/10 p-4">
          <Metric label="Level" value={totals.level || 1} />
          <Metric label="XP" value={totals.xp || 0} />
          <Metric label="Courses" value={totals.completedCourses || 0} />
          <Metric label="Streak" value={totals.streak || 0} />
        </div>

        <div className="border-b border-white/10 p-3 sm:p-4">
          <div className="grid grid-cols-3 gap-1 rounded-xl border border-white/10 bg-black/20 p-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`min-w-0 rounded-lg px-2 sm:px-3 py-2 text-[10px] sm:text-xs font-mono uppercase tracking-wide transition-colors ${activeTab === tab.id ? 'bg-neonViolet text-black' : 'text-gray-400 hover:text-white'}`}
              >
                {tab.label} <span className="opacity-70">({tab.count})</span>
              </button>
            ))}
          </div>
        </div>

        <div className="max-h-[calc(86vh-238px)] overflow-y-auto custom-scrollbar p-4">
          {activeTab === 'courses' ? <ChildCourses courses={courses} /> : null}
          {activeTab === 'achievements' ? <ChildAchievements achievements={achievements} /> : null}
          {activeTab === 'chats' ? <ChildChats chats={chats} /> : null}
        </div>
      </div>
    </div>
  ), document.body);
}

function ChildCourses({ courses }) {
  if (!courses.length) {
    return <EmptyDetail icon="icon-book-open" text="No course activity yet." />;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {courses.map((course) => (
        <div key={course.course_id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-base font-bold text-white">{course.title}</div>
              <div className="truncate font-mono text-xs text-gray-500">{course.topic || course.subject}</div>
            </div>
            <div className="shrink-0 rounded-full border border-white/10 bg-black/30 px-2 py-1 font-mono text-[10px] text-gray-300">
              {course.completed ? 'Completed' : `${Number(course.progress_percentage || 0)}%`}
            </div>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/40">
            <div className="h-full bg-neonViolet" style={{ width: `${course.completed ? 100 : Math.min(100, Number(course.progress_percentage || 0))}%` }}></div>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <Metric label="Course XP" value={course.xp_in_course || 0} />
            <Metric label="Coins" value={course.coins_earned || 0} />
            <Metric label="Level" value={course.level || 1} />
          </div>
        </div>
      ))}
    </div>
  );
}

function ChildAchievements({ achievements }) {
  if (!achievements.length) {
    return <EmptyDetail icon="icon-trophy" text="No achievements unlocked yet." />;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {achievements.map((achievement) => (
        <div key={achievement.id} className="rounded-xl border border-neonViolet/30 bg-neonViolet/10 p-4">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-neonViolet/20 text-neonViolet">
            <div className={`${achievement.icon || 'icon-award'} text-xl`}></div>
          </div>
          <div className="font-bold text-white">{achievement.name}</div>
          <div className="mt-1 text-sm text-gray-400">{achievement.description}</div>
          <div className="mt-3 font-mono text-[10px] uppercase text-green-300">
            Unlocked {achievement.unlocked_at ? new Date(achievement.unlocked_at).toLocaleDateString() : ''}
          </div>
        </div>
      ))}
    </div>
  );
}

function ChildChats({ chats }) {
  if (!chats.length) {
    return <EmptyDetail icon="icon-message-square" text="No AI chats found yet." />;
  }

  return (
    <div className="space-y-3">
      {chats.map((chat) => (
        <div key={chat.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="min-w-0 truncate font-mono text-xs uppercase tracking-wider text-neonViolet">
              {chat.role === 'assistant' ? 'Buddy_AI' : 'Student'} · {chat.course_title || 'Course'}
            </div>
            <div className="shrink-0 font-mono text-[10px] text-gray-500">
              {chat.created_at ? new Date(chat.created_at).toLocaleString() : ''}
            </div>
          </div>
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-200">{chat.text}</p>
        </div>
      ))}
    </div>
  );
}

function EmptyDetail({ icon, text }) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center rounded-2xl border border-white/10 bg-black/20 p-6 text-center">
      <div className={`mb-3 ${icon} text-3xl text-gray-500`}></div>
      <p className="font-mono text-sm text-gray-500">{text}</p>
    </div>
  );
}

function FamilyRequests({ user }) {
  try {
    const { state, runAction } = useFamilyLinks(user);
    const requests = (state.family?.childLinks || []).filter((link) => link.status === 'pending');

    if (state.loading || requests.length === 0) {
      return null;
    }

    return (
      <section className="glass-panel p-4 sm:p-5 min-w-0">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-neonViolet/40 bg-neonViolet/15 text-neonViolet">
            <div className="icon-users"></div>
          </div>
          <div>
            <div className="font-mono text-xs uppercase tracking-[0.25em] text-neonViolet">Parent Request</div>
            <h2 className="text-lg font-bold text-white">Connect your progress?</h2>
          </div>
        </div>

        {state.error ? (
          <div className="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300 font-mono">{state.error}</div>
        ) : null}

        <div className="space-y-3">
          {requests.map((request) => (
            <div key={request.id} className="rounded-xl border border-white/10 bg-black/20 p-4">
              <p className="text-sm text-gray-300">
                <span className="font-bold text-white">{request.parent_email || 'A parent account'}</span> wants to view your Project Lively progress.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => runAction({ action: 'accept_parent', linkId: request.id }, 'Parent connected.')}
                  disabled={state.saving}
                  className="rounded-lg bg-neonViolet px-4 py-2 text-xs font-mono font-bold uppercase text-white disabled:opacity-50"
                >
                  Accept
                </button>
                <button
                  type="button"
                  onClick={() => runAction({ action: 'reject_parent', linkId: request.id }, 'Parent request rejected.')}
                  disabled={state.saving}
                  className="rounded-lg border border-white/10 px-4 py-2 text-xs font-mono font-bold uppercase text-gray-300 disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  } catch (error) {
    console.error('FamilyRequests error:', error);
    return null;
  }
}
