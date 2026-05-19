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
  const defaultCourse = {
    title: '',
    description: '',
    subject: 'Mathematics',
    grade: '9',
    topic: '',
    difficulty: 'intermediate',
    ai_prompt: '',
    ai_aim: '',
    objectivesText: '',
    tests: [],
    objectiveQuizzes: [],
    passScore: 4,
    hints_allowed: true
  };
  const [course, setCourse] = React.useState(defaultCourse);
  const [courseError, setCourseError] = React.useState('');
  const [courseNotice, setCourseNotice] = React.useState('');
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [assignment, setAssignment] = React.useState({ classroomId: '', courseId: '' });
  const [selectedRoom, setSelectedRoom] = React.useState(null);
  const classrooms = state.educator?.classrooms || [];
  const courses = state.educator?.courses || [];
  const courseDraftKey = `lively_educator_course_draft_${user?.id || 'local'}`;

  const normalizeQuestions = (items) => (Array.isArray(items) ? items : [])
    .map((item) => ({
      question: String(item.question || '').trim(),
      options: Array.from({ length: 4 }, (_option, index) => String(item.options?.[index] || '').trim()),
      correct_index: Math.max(0, Math.min(3, Number(item.correct_index || 0))),
      explanation: String(item.explanation || '').trim()
    }))
    .filter((item) => item.question && item.options.every(Boolean));

  const normalizeDraftQuestions = (items) => (Array.isArray(items) ? items : []).map((item) => ({
    question: String(item?.question || ''),
    options: Array.from({ length: 4 }, (_option, index) => String(item?.options?.[index] || '')),
    correct_index: Math.max(0, Math.min(3, Number(item?.correct_index || 0))),
    explanation: String(item?.explanation || '')
  }));

  const hasCourseDraftContent = (draft) => Boolean(
    String(draft?.title || draft?.description || draft?.topic || draft?.ai_prompt || draft?.objectivesText || '').trim()
    || (Array.isArray(draft?.tests) && draft.tests.length > 0)
    || (Array.isArray(draft?.objectiveQuizzes) && draft.objectiveQuizzes.length > 0)
  );

  const clearCourseDraft = () => {
    try {
      window.localStorage?.removeItem(courseDraftKey);
    } catch (_error) {
      // Ignore local draft cleanup failures.
    }
  };

  React.useEffect(() => {
    try {
      const raw = window.localStorage?.getItem(courseDraftKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const draft = parsed?.course && typeof parsed.course === 'object' ? parsed.course : null;
      if (!draft) return;
      setCourse(Object.assign({}, defaultCourse, draft, {
        tests: normalizeDraftQuestions(draft.tests),
        objectiveQuizzes: normalizeDraftQuestions(draft.objectiveQuizzes),
        passScore: Math.max(1, Number(draft.passScore || 4))
      }));
      setCourseNotice('Unsaved course draft restored.');
    } catch (_error) {
      // Ignore broken local drafts.
    }
  }, [courseDraftKey]);

  React.useEffect(() => {
    try {
      if (!hasCourseDraftContent(course)) {
        window.localStorage?.removeItem(courseDraftKey);
        return;
      }
      window.localStorage?.setItem(courseDraftKey, JSON.stringify({ savedAt: new Date().toISOString(), course }));
    } catch (_error) {
      // Local drafts are best-effort only.
    }
  }, [courseDraftKey, course]);

  const submitClassroom = (event) => {
    event.preventDefault();
    runAction({ action: 'create_classroom', name: classroom.name, description: classroom.description }, 'Classroom created.');
    setClassroom({ name: '', description: '' });
  };

  const submitCourse = (event) => {
    event.preventDefault();
    setCourseError('');
    const objectives = String(course.objectivesText || '').split('\n').map((line) => line.trim()).filter(Boolean);
    const hasIncompleteQuestion = (items) => (Array.isArray(items) ? items : []).some((item) => {
      const hasAnyText = String(item.question || '').trim() || String(item.explanation || '').trim() || (item.options || []).some((option) => String(option || '').trim());
      const hasAllOptions = Array.from({ length: 4 }, (_option, index) => String(item.options?.[index] || '').trim()).every(Boolean);
      return hasAnyText && (!String(item.question || '').trim() || !hasAllOptions);
    });
    if (hasIncompleteQuestion(course.tests) || hasIncompleteQuestion(course.objectiveQuizzes)) {
      setCourseError('Each quiz question needs question text and all 4 options.');
      return;
    }
    const tests = normalizeQuestions(course.tests);
    const objective_quizzes = normalizeQuestions(course.objectiveQuizzes);
    runAction(Object.assign({}, course, { action: 'create_course', objectives, tests, objective_quizzes, pass_score: course.passScore, hints_allowed: course.hints_allowed }), 'Course and test saved.');
    clearCourseDraft();
    setCourse(defaultCourse);
    setCourseError('');
    setCourseNotice('');
  };

  const emptyQuestion = () => ({ question: '', options: ['', '', '', ''], correct_index: 0, explanation: '' });

  const updateQuestionList = (key, updater) => {
    setCourse((current) => Object.assign({}, current, { [key]: updater(current[key] || []) }));
  };

  const addQuestion = (key) => {
    updateQuestionList(key, (items) => [...items, emptyQuestion()]);
  };

  const removeQuestion = (key, questionIndex) => {
    updateQuestionList(key, (items) => items.filter((_item, index) => index !== questionIndex));
  };

  const updateQuestion = (key, questionIndex, patch) => {
    updateQuestionList(key, (items) => items.map((item, index) => index === questionIndex ? Object.assign({}, item, patch) : item));
  };

  const updateQuestionOption = (key, questionIndex, optionIndex, value) => {
    updateQuestionList(key, (items) => items.map((item, index) => {
      if (index !== questionIndex) return item;
      const options = Array.from({ length: 4 }, (_option, currentIndex) => String(item.options?.[currentIndex] || ''));
      options[optionIndex] = value;
      return Object.assign({}, item, { options });
    }));
  };

  const renderQuestionBuilder = (title, description, stateKey) => {
    const questions = course[stateKey] || [];
    return (
      <div className="rounded-xl border border-white/10 bg-black/20 p-3">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <div className="font-mono text-xs uppercase tracking-[0.2em] text-neonViolet">{title}</div>
            <p className="mt-1 text-xs text-gray-400">{description}</p>
          </div>
          <button type="button" onClick={() => addQuestion(stateKey)} className="rounded-lg border border-neonViolet/40 bg-neonViolet/10 px-3 py-2 font-mono text-xs font-bold uppercase text-neonViolet">Add</button>
        </div>

        {!questions.length ? (
          <button type="button" onClick={() => addQuestion(stateKey)} className="w-full rounded-lg border border-dashed border-white/20 bg-white/[0.03] px-3 py-4 text-left text-sm text-gray-300">
            Add a question with 4 clickable options.
          </button>
        ) : null}

        <div className="space-y-3">
          {questions.map((item, questionIndex) => (
            <div key={`${stateKey}-${questionIndex}`} className="rounded-xl border border-white/10 bg-black/30 p-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="font-mono text-[11px] uppercase tracking-wider text-gray-400">Question {questionIndex + 1}</div>
                <button type="button" onClick={() => removeQuestion(stateKey, questionIndex)} className="rounded-md border border-red-500/30 bg-red-500/10 px-2 py-1 font-mono text-[11px] text-red-300">Delete</button>
              </div>
              <textarea value={item.question} onChange={(e) => updateQuestion(stateKey, questionIndex, { question: e.target.value })} placeholder="Question" rows="2" className="field mb-2" />
              <div className="space-y-2">
                {Array.from({ length: 4 }, (_option, optionIndex) => {
                  const selected = Number(item.correct_index || 0) === optionIndex;
                  return (
                    <div key={`${stateKey}-${questionIndex}-${optionIndex}`} className={`grid grid-cols-[38px_1fr] gap-2 rounded-lg border p-2 ${selected ? 'border-mcGreen/60 bg-mcGreen/10' : 'border-white/10 bg-white/[0.03]'}`}>
                      <button type="button" onClick={() => updateQuestion(stateKey, questionIndex, { correct_index: optionIndex })} className={`rounded-md font-mono text-xs font-bold ${selected ? 'bg-mcGreen text-black' : 'bg-black/40 text-gray-300'}`}>{String.fromCharCode(65 + optionIndex)}</button>
                      <input value={item.options?.[optionIndex] || ''} onChange={(e) => updateQuestionOption(stateKey, questionIndex, optionIndex, e.target.value)} placeholder={`Option ${String.fromCharCode(65 + optionIndex)}`} className="field py-2" />
                    </div>
                  );
                })}
              </div>
              <input value={item.explanation} onChange={(e) => updateQuestion(stateKey, questionIndex, { explanation: e.target.value })} placeholder="Explanation" className="field mt-2" />
            </div>
          ))}
        </div>
      </div>
    );
  };

  const submitAssignment = (event) => {
    event.preventDefault();
    runAction(Object.assign({ action: 'assign_course' }, assignment), 'Course assigned to classroom.');
  };

  const finalPreviewQuestions = normalizeQuestions(course.tests);

  return (
    <React.Fragment>
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
              <button type="button" onClick={() => setSelectedRoom(room)} className="mt-3 w-full rounded-lg bg-neonViolet px-3 py-2 font-mono text-xs font-bold uppercase text-white">Open Class</button>
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
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <div className="font-mono text-xs uppercase tracking-[0.25em] text-neonViolet">Course Builder</div>
            <h2 className="mt-2 text-2xl font-bold">Create Course + Test</h2>
            <p className="mt-2 text-[11px] font-mono uppercase tracking-wider text-mcGreen">Draft autosaves on this device</p>
          </div>
          <button
            type="button"
            onClick={() => {
              clearCourseDraft();
              setCourseNotice('Local course draft cleared.');
            }}
            className="rounded-lg border border-white/10 bg-white/10 px-3 py-2 font-mono text-xs uppercase tracking-wider text-gray-300 hover:bg-white/20"
          >
            Clear Draft
          </button>
        </div>
        <form onSubmit={submitCourse} className="space-y-3">
          {courseError ? <Notice tone="error" text={courseError} /> : null}
          {courseNotice ? <Notice tone="success" text={courseNotice} /> : null}
          <input value={course.title} onChange={(e) => setCourse((c) => Object.assign({}, c, { title: e.target.value }))} placeholder="Course title" className="field" />
          <textarea value={course.description} onChange={(e) => setCourse((c) => Object.assign({}, c, { description: e.target.value }))} placeholder="Description" rows="2" className="field" />
          <div className="grid grid-cols-2 gap-3">
            <input value={course.subject} onChange={(e) => setCourse((c) => Object.assign({}, c, { subject: e.target.value }))} placeholder="Subject" className="field" />
            <input value={course.grade} onChange={(e) => setCourse((c) => Object.assign({}, c, { grade: e.target.value }))} placeholder="Grade" className="field" />
          </div>
          <input value={course.topic} onChange={(e) => setCourse((c) => Object.assign({}, c, { topic: e.target.value }))} placeholder="Topic" className="field" />
          <textarea value={course.ai_prompt} onChange={(e) => setCourse((c) => Object.assign({}, c, { ai_prompt: e.target.value }))} placeholder="Buddy_AI tutor instructions" rows="4" className="field font-mono text-xs" />
          <textarea value={course.objectivesText} onChange={(e) => setCourse((c) => Object.assign({}, c, { objectivesText: e.target.value }))} placeholder="Objectives, one per line" rows="4" className="field font-mono text-xs" />
          {renderQuestionBuilder('After-Objective Quizzes', 'Optional quick checks Buddy_AI can drop into chat.', 'objectiveQuizzes')}
          {renderQuestionBuilder('Final Test Questions', 'Students answer these after completing all objectives.', 'tests')}
          <div className="grid grid-cols-2 gap-3">
            <input type="number" min="1" max={Math.max(1, course.tests.length)} value={course.passScore} onChange={(e) => setCourse((c) => Object.assign({}, c, { passScore: Number(e.target.value || 1) }))} placeholder="Pass score" className="field" />
            <div className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 font-mono text-sm text-gray-400">{course.tests.length} final questions</div>
          </div>
          <button type="button" onClick={() => setPreviewOpen(true)} className="w-full rounded-xl border border-blue-400/40 bg-blue-400/10 px-4 py-3 font-mono text-sm font-bold uppercase text-blue-300 hover:bg-blue-400 hover:text-black">Preview Final Test</button>
          <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/30 px-4 py-3 font-mono text-sm text-gray-300">
            <input type="checkbox" checked={course.hints_allowed} onChange={(e) => setCourse((c) => Object.assign({}, c, { hints_allowed: e.target.checked }))} className="h-4 w-4 accent-neonViolet" />
            Allow hints for this classroom course
          </label>
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

      {selectedRoom ? <EducatorClassModal room={selectedRoom} onClose={() => setSelectedRoom(null)} /> : null}
    </div>
    {previewOpen ? (
      <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" onClick={() => setPreviewOpen(false)}>
        <div className="max-h-[86vh] w-full max-w-4xl overflow-hidden rounded-2xl border border-white/10 bg-darkBg shadow-[0_20px_70px_rgba(0,0,0,0.6)]" onClick={(event) => event.stopPropagation()}>
          <div className="flex items-center justify-between border-b border-white/10 p-5">
            <div>
              <div className="font-mono text-xs uppercase tracking-[0.25em] text-blue-300">Final Test Preview</div>
              <h2 className="text-2xl font-bold">{course.title || 'Untitled Course'} Final Test</h2>
              <p className="mt-1 text-xs font-mono text-gray-400">Pass score: {Math.max(1, Math.min(finalPreviewQuestions.length || 1, Number(course.passScore || 4)))}/{finalPreviewQuestions.length || 1}</p>
            </div>
            <button type="button" onClick={() => setPreviewOpen(false)} className="rounded-lg bg-white/10 px-3 py-2 text-gray-300 hover:text-white">Close</button>
          </div>
          <div className="max-h-[calc(86vh-96px)] overflow-y-auto p-5 custom-scrollbar">
            {finalPreviewQuestions.length ? (
              <div className="space-y-4">
                {finalPreviewQuestions.map((question, questionIndex) => (
                  <div key={`educator-preview-${questionIndex}`} className="rounded-xl border border-white/10 bg-black/25 p-4">
                    <div className="mb-3 font-bold">{questionIndex + 1}. {question.question}</div>
                    <div className="space-y-2">
                      {question.options.map((option, optionIndex) => (
                        <div key={`educator-preview-${questionIndex}-${optionIndex}`} className={`rounded-lg border px-3 py-2 text-sm ${question.correct_index === optionIndex ? 'border-mcGreen/60 bg-mcGreen/10 text-mcGreen' : 'border-white/10 bg-white/5 text-gray-200'}`}>
                          <span className="mr-2 font-mono font-bold">{String.fromCharCode(65 + optionIndex)}</span>{option}
                        </div>
                      ))}
                    </div>
                    {question.explanation ? <div className="mt-3 text-xs text-gray-400">Explanation: {question.explanation}</div> : null}
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-white/20 bg-white/[0.03] p-8 text-center text-gray-300">Add at least one complete final-test question to preview the student test.</div>
            )}
          </div>
        </div>
      </div>
    ) : null}
    </React.Fragment>
  );
}

function EducatorClassModal({ room, onClose }) {
  const students = room.students || [];
  const courses = room.courses || [];
  const alerts = [];
  if (!students.length) alerts.push('No students have joined this class yet.');
  if (!courses.length) alerts.push('No courses assigned to this class yet.');
  students.forEach((student) => {
    if (Number(student.total_courses_completed || 0) === 0 && courses.length) {
      alerts.push(`${student.display_name || student.username || student.student_email || 'A student'} has not completed any assigned course yet.`);
    }
  });

  return ReactDOM.createPortal((
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="max-h-[86vh] w-full max-w-5xl overflow-hidden rounded-2xl border border-white/10 bg-darkBg shadow-[0_20px_70px_rgba(0,0,0,0.6)]" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-white/10 p-5">
          <div>
            <div className="font-mono text-xs uppercase tracking-[0.25em] text-neonViolet">Classroom Stats</div>
            <h2 className="text-2xl font-bold">{room.name}</h2>
          </div>
          <button onClick={onClose} className="rounded-lg bg-white/10 p-3 text-gray-300 hover:text-white"><div className="icon-x"></div></button>
        </div>
        <div className="max-h-[calc(86vh-86px)] overflow-y-auto p-5 custom-scrollbar">
          <section className="mb-5 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4">
            <div className="mb-2 font-mono text-xs uppercase tracking-wider text-yellow-200">Teacher Notifications</div>
            {alerts.length ? alerts.slice(0, 6).map((alert) => <div key={alert} className="text-sm text-yellow-100">- {alert}</div>) : <div className="text-sm text-yellow-100">No urgent classroom signals right now.</div>}
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-xl border border-white/10 bg-black/20 p-4">
              <h3 className="mb-3 font-bold">Students</h3>
              <div className="space-y-2">
                {students.map((student) => (
                  <div key={student.id} className="rounded-lg bg-white/[0.03] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-bold">{student.display_name || student.username || student.student_email || student.student_id}</div>
                        <div className="font-mono text-xs text-gray-500">{student.student_email}</div>
                      </div>
                      <div className="font-mono text-xs text-gray-400">LVL {student.global_level || 1}</div>
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                      <Metric label="XP" value={student.total_xp || 0} />
                      <Metric label="Done" value={student.total_courses_completed || 0} />
                      <Metric label="Streak" value={student.current_streak || 0} />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-xl border border-white/10 bg-black/20 p-4">
              <h3 className="mb-3 font-bold">Assigned Courses</h3>
              <div className="space-y-2">
                {courses.map((course) => (
                  <div key={course.id} className="rounded-lg bg-white/[0.03] p-3">
                    <div className="font-bold">{course.title}</div>
                    <div className="font-mono text-xs text-gray-500">{course.topic || course.subject}</div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  ), document.body);
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
