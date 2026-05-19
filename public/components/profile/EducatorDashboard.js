function useEducatorData(user) {
  const [state, setState] = React.useState({ loading: true, saving: false, error: '', notice: '', educator: { classrooms: [], courses: [] } });

  const load = React.useCallback(async () => {
    if (!user?.id) return;
    setState((current) => Object.assign({}, current, { loading: true, error: '' }));
    try {
      const response = await fetch(`/api/profile?mode=educator&userId=${encodeURIComponent(user.id)}&email=${encodeURIComponent(user.email || '')}`);
      const payload = await response.json();
      if (!response.ok || !payload?.success) throw new Error(payload?.error || 'Failed to load educator dashboard.');
      setState((current) => Object.assign({}, current, { loading: false, educator: payload.data?.educator || current.educator }));
    } catch (error) {
      setState((current) => Object.assign({}, current, { loading: false, error: error?.message || 'Failed to load educator dashboard.' }));
    }
  }, [user?.id, user?.email]);

  const runAction = React.useCallback(async (body, notice) => {
    if (!user?.id) return;
    setState((current) => Object.assign({}, current, { saving: true, error: '', notice: '' }));
    try {
      const response = await fetch(`/api/profile?mode=educator&userId=${encodeURIComponent(user.id)}&email=${encodeURIComponent(user.email || '')}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const payload = await response.json();
      if (!response.ok || !payload?.success) throw new Error(payload?.error || 'Educator action failed.');
      setState((current) => Object.assign({}, current, { saving: false, notice: notice || 'Saved.' }));
      await load();
    } catch (error) {
      setState((current) => Object.assign({}, current, { saving: false, error: error?.message || 'Educator action failed.' }));
    }
  }, [user?.id, user?.email, load]);

  React.useEffect(() => {
    load();
  }, [load]);

  return { state, runAction };
}

function EducatorDashboard({ user }) {
  const { state, runAction } = useEducatorData(user);
  const [classroom, setClassroom] = React.useState({ name: '', description: '' });
  const [course, setCourse] = React.useState({
    title: '',
    description: '',
    subject: 'Mathematics',
    grade: '9',
    topic: '',
    difficulty: 'intermediate',
    ai_prompt: '',
    ai_aim: '',
    objectivesText: '',
    testText: ''
  });
  const [assignment, setAssignment] = React.useState({ classroomId: '', courseId: '' });
  const classrooms = state.educator?.classrooms || [];
  const courses = state.educator?.courses || [];

  const submitClassroom = (event) => {
    event.preventDefault();
    runAction({ action: 'create_classroom', name: classroom.name, description: classroom.description }, 'Classroom created.');
    setClassroom({ name: '', description: '' });
  };

  const submitCourse = (event) => {
    event.preventDefault();
    const objectives = String(course.objectivesText || '').split('\n').map((line) => line.trim()).filter(Boolean);
    const tests = String(course.testText || '').split('\n').map((line) => line.trim()).filter(Boolean).map((question) => ({ question }));
    runAction(Object.assign({}, course, { action: 'create_course', objectives, tests }), 'Course and test saved.');
    setCourse((current) => Object.assign({}, current, { title: '', description: '', topic: '', ai_prompt: '', ai_aim: '', objectivesText: '', testText: '' }));
  };

  const submitAssignment = (event) => {
    event.preventDefault();
    runAction(Object.assign({ action: 'assign_course' }, assignment), 'Course assigned to classroom.');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-8 min-w-0">
      <section className="lg:col-span-4 glass-panel p-4 sm:p-6">
        <div className="mb-5">
          <div className="font-mono text-xs uppercase tracking-[0.25em] text-neonViolet">Educator Mode</div>
          <h2 className="mt-2 text-2xl font-bold">Classrooms</h2>
          <p className="mt-2 text-sm text-gray-400">Create a room, share the code, then assign your courses.</p>
        </div>

        {state.error ? <Notice tone="error" text={state.error} /> : null}
        {state.notice ? <Notice tone="success" text={state.notice} /> : null}

        <form onSubmit={submitClassroom} className="space-y-3">
          <input value={classroom.name} onChange={(e) => setClassroom((c) => Object.assign({}, c, { name: e.target.value }))} placeholder="Classroom name" className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-neonViolet" />
          <textarea value={classroom.description} onChange={(e) => setClassroom((c) => Object.assign({}, c, { description: e.target.value }))} placeholder="Short description" rows="3" className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-neonViolet" />
          <button disabled={state.saving || !classroom.name.trim()} className="w-full rounded-xl bg-neonViolet px-4 py-3 font-mono text-sm font-bold uppercase text-white disabled:opacity-50">Create Classroom</button>
        </form>

        <div className="mt-6 space-y-3">
          {classrooms.map((room) => (
            <div key={room.id} className="rounded-xl border border-white/10 bg-black/20 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate font-bold">{room.name}</div>
                  <div className="font-mono text-xs text-gray-500">{room.student_count || 0} students · {room.course_count || 0} courses</div>
                </div>
                <button type="button" onClick={() => navigator.clipboard?.writeText(room.join_code)} className="rounded-lg border border-neonViolet/40 bg-neonViolet/10 px-3 py-2 font-mono text-xs text-neonViolet">{room.join_code}</button>
              </div>
              {room.students?.length ? (
                <div className="mt-3 space-y-2">
                  {room.students.slice(0, 4).map((student) => (
                    <div key={student.id} className="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2 text-xs">
                      <span className="truncate">{student.display_name || student.username || student.student_email || student.student_id}</span>
                      <span className="font-mono text-gray-500">LVL {student.global_level || 1}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      <section className="lg:col-span-5 glass-panel p-4 sm:p-6">
        <div className="mb-5">
          <div className="font-mono text-xs uppercase tracking-[0.25em] text-neonViolet">Course Builder</div>
          <h2 className="mt-2 text-2xl font-bold">Create Course + Test</h2>
        </div>
        <form onSubmit={submitCourse} className="space-y-3">
          <input value={course.title} onChange={(e) => setCourse((c) => Object.assign({}, c, { title: e.target.value }))} placeholder="Course title" className="field" />
          <textarea value={course.description} onChange={(e) => setCourse((c) => Object.assign({}, c, { description: e.target.value }))} placeholder="Description" rows="2" className="field" />
          <div className="grid grid-cols-2 gap-3">
            <input value={course.subject} onChange={(e) => setCourse((c) => Object.assign({}, c, { subject: e.target.value }))} placeholder="Subject" className="field" />
            <input value={course.grade} onChange={(e) => setCourse((c) => Object.assign({}, c, { grade: e.target.value }))} placeholder="Grade" className="field" />
          </div>
          <input value={course.topic} onChange={(e) => setCourse((c) => Object.assign({}, c, { topic: e.target.value }))} placeholder="Topic" className="field" />
          <textarea value={course.ai_prompt} onChange={(e) => setCourse((c) => Object.assign({}, c, { ai_prompt: e.target.value }))} placeholder="Buddy_AI tutor instructions" rows="4" className="field font-mono text-xs" />
          <textarea value={course.objectivesText} onChange={(e) => setCourse((c) => Object.assign({}, c, { objectivesText: e.target.value }))} placeholder="Objectives, one per line" rows="4" className="field font-mono text-xs" />
          <textarea value={course.testText} onChange={(e) => setCourse((c) => Object.assign({}, c, { testText: e.target.value }))} placeholder="Test questions, one per line" rows="4" className="field font-mono text-xs" />
          <button disabled={state.saving || !course.title.trim()} className="w-full rounded-xl bg-neonViolet px-4 py-3 font-mono text-sm font-bold uppercase text-white disabled:opacity-50">Save Course</button>
        </form>
      </section>

      <section className="lg:col-span-3 glass-panel p-4 sm:p-6">
        <div className="mb-5">
          <div className="font-mono text-xs uppercase tracking-[0.25em] text-neonViolet">Assign</div>
          <h2 className="mt-2 text-2xl font-bold">Send to Class</h2>
        </div>
        <form onSubmit={submitAssignment} className="space-y-3">
          <select value={assignment.classroomId} onChange={(e) => setAssignment((a) => Object.assign({}, a, { classroomId: e.target.value }))} className="field">
            <option value="">Select classroom</option>
            {classrooms.map((room) => <option key={room.id} value={room.id}>{room.name}</option>)}
          </select>
          <select value={assignment.courseId} onChange={(e) => setAssignment((a) => Object.assign({}, a, { courseId: e.target.value }))} className="field">
            <option value="">Select course</option>
            {courses.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
          </select>
          <button disabled={state.saving || !assignment.classroomId || !assignment.courseId} className="w-full rounded-xl bg-neonViolet px-4 py-3 font-mono text-sm font-bold uppercase text-white disabled:opacity-50">Assign Course</button>
        </form>

        <div className="mt-6 space-y-3">
          {courses.map((item) => (
            <div key={item.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
              <div className="font-bold">{item.title}</div>
              <div className="font-mono text-xs text-gray-500">{item.assigned_count || 0} assignments</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function ClassroomJoinCard({ user }) {
  const [code, setCode] = React.useState('');
  const [status, setStatus] = React.useState({ saving: false, error: '', notice: '' });

  const join = async (event) => {
    event.preventDefault();
    setStatus({ saving: true, error: '', notice: '' });
    try {
      const response = await fetch(`/api/profile?mode=classroom&userId=${encodeURIComponent(user.id)}&email=${encodeURIComponent(user.email || '')}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'join_by_code', joinCode: code })
      });
      const payload = await response.json();
      if (!response.ok || !payload?.success) throw new Error(payload?.error || 'Could not join classroom.');
      setStatus({ saving: false, error: '', notice: `Joined ${payload.data?.classroom?.name || 'classroom'}.` });
      setCode('');
      if (window.LivelyProgress?.setUserContext) window.LivelyProgress.setUserContext(user).catch(() => {});
    } catch (error) {
      setStatus({ saving: false, error: error?.message || 'Could not join classroom.', notice: '' });
    }
  };

  return (
    <section className="glass-panel p-4 sm:p-5 min-w-0">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-neonViolet/40 bg-neonViolet/15 text-neonViolet"><div className="icon-door-open"></div></div>
        <div>
          <div className="font-mono text-xs uppercase tracking-[0.25em] text-neonViolet">Classroom</div>
          <h2 className="text-lg font-bold text-white">Join with code</h2>
        </div>
      </div>
      {status.error ? <Notice tone="error" text={status.error} /> : null}
      {status.notice ? <Notice tone="success" text={status.notice} /> : null}
      <form onSubmit={join} className="flex flex-col sm:flex-row gap-2">
        <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="CLASS CODE" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-4 py-3 font-mono text-white outline-none focus:border-neonViolet" />
        <button disabled={status.saving || !code.trim()} className="rounded-xl bg-neonViolet px-5 py-3 font-mono text-sm font-bold uppercase text-white disabled:opacity-50">Join</button>
      </form>
    </section>
  );
}

function Notice({ tone, text }) {
  const style = tone === 'error' ? 'border-red-500/30 bg-red-500/10 text-red-300' : 'border-green-500/30 bg-green-500/10 text-green-300';
  return <div className={`mb-4 rounded-xl border p-3 text-sm font-mono ${style}`}>{text}</div>;
}
