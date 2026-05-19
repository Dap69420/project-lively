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

  React.useEffect(() => {
    loadFamily();
  }, [loadFamily]);

  return { state, loadFamily, runAction };
}

function ParentDashboard({ user }) {
  try {
    const { state, runAction } = useFamilyLinks(user);
    const [childEmail, setChildEmail] = React.useState('');
    const parentLinks = state.family?.parentLinks || [];
    const children = state.family?.children || [];
    const limit = state.family?.limits || { maxChildren: 3, usedChildren: parentLinks.length };
    const remaining = Math.max(0, Number(limit.maxChildren || 3) - Number(limit.usedChildren || 0));

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
              const courses = progress.courses || [];
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

                  <div className="mt-4 space-y-2">
                    {courses.length === 0 ? (
                      <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-gray-500 font-mono">No course activity yet.</div>
                    ) : null}
                    {courses.map((course) => (
                      <div key={course.course_id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-bold text-white">{course.title}</div>
                            <div className="truncate font-mono text-xs text-gray-500">{course.topic || course.subject}</div>
                          </div>
                          <div className="shrink-0 font-mono text-xs text-gray-400">{course.completed ? 'Completed' : `${Number(course.progress_percentage || 0)}%`}</div>
                        </div>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/40">
                          <div className="h-full bg-neonViolet" style={{ width: `${course.completed ? 100 : Math.min(100, Number(course.progress_percentage || 0))}%` }}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
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
