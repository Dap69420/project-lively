function CourseForm({ accessToken, editingCourse, onCancelEdit, onSuccess }) {
  try {
    const initialState = {
      title: '',
      description: '',
      subject: 'Mathematics',
      grade: '9',
      topic: '',
      difficulty: 'intermediate',
      ai_prompt: '',
      ai_aim: '',
      completion_xp: 250,
      completion_coins: 50,
      thumbnail_url: '',
      objectivesText: '',
      cardBannerText: '',
      cardAccentColor: '#55ff55',
      cardBackgroundColor: '#121826',
      cardBorderColor: '#2dd4bf',
      cardRotation: 0,
      moodStyle: 'adaptive',
      quizEnabled: true,
      quizFrequency: 'after_objective',
      quizDifficulty: 'mixed',
      quizStyle: 'mcq',
      educatorTests: [],
      educatorPassScore: 4
    };

    const [formData, setFormData] = React.useState(initialState);
    const [loading, setLoading] = React.useState(false);
    const [success, setSuccess] = React.useState('');
    const [error, setError] = React.useState('');
    const [previewOpen, setPreviewOpen] = React.useState(false);
    const isEditing = Boolean(editingCourse?.id);
    const draftKey = `lively_admin_course_draft_${editingCourse?.id || 'new'}`;
    const loadedFormJsonRef = React.useRef('');

    const subjects = ['Mathematics', 'Science', 'English', 'History', 'Physics', 'Chemistry', 'Biology'];
    const grades = ['6', '7', '8', '9'];
    const difficulties = ['beginner', 'intermediate', 'advanced'];
    const moodStyles = ['adaptive', 'friendly', 'focused', 'playful', 'strict'];
    const quizFrequencies = [
      { value: 'off', label: 'Never' },
      { value: 'after_objective', label: 'After objective progress' },
      { value: 'every_3_messages', label: 'Every 3 student messages' },
      { value: 'every_5_messages', label: 'Every 5 student messages' }
    ];
    const quizDifficulties = ['easy', 'mixed', 'hard'];
    const emptyTestQuestion = () => ({
      question: '',
      options: ['', '', '', ''],
      correct_index: 0,
      explanation: ''
    });

    const normalizeJsonArray = (value) => {
      if (Array.isArray(value)) return value;
      if (!value) return [];
      try {
        const parsed = typeof value === 'string' ? JSON.parse(value) : value;
        return Array.isArray(parsed) ? parsed : [];
      } catch (_error) {
        return [];
      }
    };

    const normalizeJsonObject = (value) => {
      if (value && typeof value === 'object' && !Array.isArray(value)) return value;
      if (!value) return {};
      try {
        const parsed = typeof value === 'string' ? JSON.parse(value) : value;
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
      } catch (_error) {
        return {};
      }
    };

    const normalizeEducatorTests = (items) => normalizeJsonArray(items).map((item) => ({
      question: String(item?.question || ''),
      options: Array.from({ length: 4 }, (_option, index) => String(item?.options?.[index] || '')),
      correct_index: Math.max(0, Math.min(3, Number(item?.correct_index ?? item?.correctIndex ?? 0))),
      explanation: String(item?.explanation || '')
    }));

    const readDraft = (key) => {
      try {
        if (!window.localStorage) return null;
        const raw = window.localStorage.getItem(key);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return parsed?.formData && typeof parsed.formData === 'object' ? parsed.formData : null;
      } catch (_error) {
        return null;
      }
    };

    const clearDraft = () => {
      try {
        window.localStorage?.removeItem(draftKey);
      } catch (_error) {
        // Ignore local draft cleanup failures.
      }
    };

    const hasDraftContent = (data) => Boolean(
      String(data?.title || data?.description || data?.topic || data?.ai_prompt || data?.objectivesText || '').trim()
      || (Array.isArray(data?.educatorTests) && data.educatorTests.length > 0)
    );

    React.useEffect(() => {
      const draft = readDraft(draftKey);
      if (!editingCourse) {
        const nextFormData = draft ? Object.assign({}, initialState, draft, {
          educatorTests: normalizeEducatorTests(draft.educatorTests),
          educatorPassScore: Math.max(1, Number(draft.educatorPassScore || initialState.educatorPassScore))
        }) : initialState;
        loadedFormJsonRef.current = draft ? '' : JSON.stringify(nextFormData);
        setFormData(nextFormData);
        setSuccess('');
        setError('');
        if (draft) setSuccess('Unsaved draft restored.');
        return;
      }

      const objectives = normalizeJsonArray(editingCourse.objectives);
      const cardStyle = normalizeJsonObject(editingCourse.card_style);
      const aiSettings = normalizeJsonObject(editingCourse.ai_settings);

      const nextFormData = {
        title: editingCourse.title || '',
        description: editingCourse.description || '',
        subject: editingCourse.subject || 'Mathematics',
        grade: String(editingCourse.grade || '9'),
        topic: editingCourse.topic || '',
        difficulty: editingCourse.difficulty || 'intermediate',
        ai_prompt: editingCourse.ai_prompt || '',
        ai_aim: editingCourse.ai_aim || '',
        completion_xp: Number(editingCourse.completion_xp || 250),
        completion_coins: Number(editingCourse.completion_coins || 50),
        thumbnail_url: editingCourse.thumbnail_url || '',
        objectivesText: objectives.join('\n'),
        cardBannerText: cardStyle.banner_text || '',
        cardAccentColor: cardStyle.accent_color || '#55ff55',
        cardBackgroundColor: cardStyle.background_color || '#121826',
        cardBorderColor: cardStyle.border_color || '#2dd4bf',
        cardRotation: Number(cardStyle.rotation || 0),
        moodStyle: aiSettings.mood_style || 'adaptive',
        quizEnabled: aiSettings.quiz_enabled !== false && aiSettings.quiz_frequency !== 'off',
        quizFrequency: aiSettings.quiz_frequency || 'after_objective',
        quizDifficulty: aiSettings.quiz_difficulty || 'mixed',
        quizStyle: aiSettings.quiz_style || 'mcq',
        educatorTests: normalizeEducatorTests(aiSettings.educator_tests),
        educatorPassScore: Math.max(1, Number(aiSettings.educator_pass_score || 4))
      };
      const hydratedFormData = draft ? Object.assign({}, nextFormData, draft, {
        educatorTests: normalizeEducatorTests(draft.educatorTests),
        educatorPassScore: Math.max(1, Number(draft.educatorPassScore || nextFormData.educatorPassScore))
      }) : nextFormData;
      loadedFormJsonRef.current = draft ? '' : JSON.stringify(hydratedFormData);
      setFormData(hydratedFormData);
      setSuccess('');
      setError('');
      if (draft) setSuccess('Unsaved draft restored.');
    }, [editingCourse?.id]);

    React.useEffect(() => {
      try {
        if (!window.localStorage) return;
        const serializedForm = JSON.stringify(formData);
        if (serializedForm === loadedFormJsonRef.current) return;
        if (!isEditing && !hasDraftContent(formData)) {
          window.localStorage.removeItem(draftKey);
          return;
        }
        window.localStorage.setItem(draftKey, JSON.stringify({ savedAt: new Date().toISOString(), formData }));
      } catch (_error) {
        // Local drafts are best-effort only.
      }
    }, [draftKey, formData]);

    const handleChange = (e) => {
      const { name, value } = e.target;
      setFormData((prev) => ({
        ...prev,
        [name]: e.target.type === 'checkbox' ? e.target.checked : ['completion_xp', 'completion_coins', 'cardRotation', 'educatorPassScore'].includes(name) ? parseInt(value || '0', 10) : value
      }));
    };

    const updateEducatorTest = (questionIndex, patch) => {
      setFormData((prev) => ({
        ...prev,
        educatorTests: (prev.educatorTests || []).map((question, index) => (
          index === questionIndex ? Object.assign({}, question, patch) : question
        ))
      }));
    };

    const updateEducatorTestOption = (questionIndex, optionIndex, value) => {
      setFormData((prev) => ({
        ...prev,
        educatorTests: (prev.educatorTests || []).map((question, index) => {
          if (index !== questionIndex) return question;
          const options = Array.from({ length: 4 }, (_option, currentIndex) => String(question.options?.[currentIndex] || ''));
          options[optionIndex] = value;
          return Object.assign({}, question, { options });
        })
      }));
    };

    const addEducatorTest = () => {
      setFormData((prev) => ({
        ...prev,
        educatorTests: [...(prev.educatorTests || []), emptyTestQuestion()]
      }));
    };

    const removeEducatorTest = (questionIndex) => {
      setFormData((prev) => ({
        ...prev,
        educatorTests: (prev.educatorTests || []).filter((_question, index) => index !== questionIndex),
        educatorPassScore: Math.max(1, Math.min(Number(prev.educatorPassScore || 1), Math.max(1, (prev.educatorTests || []).length - 1)))
      }));
    };

    const moveEducatorTest = (questionIndex, direction) => {
      setFormData((prev) => {
        const tests = [...(prev.educatorTests || [])];
        const nextIndex = questionIndex + direction;
        if (nextIndex < 0 || nextIndex >= tests.length) return prev;
        const current = tests[questionIndex];
        tests[questionIndex] = tests[nextIndex];
        tests[nextIndex] = current;
        return Object.assign({}, prev, { educatorTests: tests });
      });
    };

    const previewQuestions = () => (formData.educatorTests || [])
      .map((item) => ({
        question: String(item.question || '').trim(),
        options: Array.from({ length: 4 }, (_option, index) => String(item.options?.[index] || '').trim()),
        correct_index: Math.max(0, Math.min(3, Math.floor(Number(item.correct_index || 0)))),
        explanation: String(item.explanation || '').trim()
      }))
      .filter((item) => item.question && item.options.every(Boolean));

    const buildCoursePayload = () => {
      const objectives = String(formData.objectivesText || '')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
      const educatorTests = previewQuestions();

      return {
        title: formData.title,
        description: formData.description,
        subject: formData.subject,
        grade: formData.grade,
        topic: formData.topic,
        difficulty: formData.difficulty,
        ai_prompt: formData.ai_prompt,
        ai_aim: formData.ai_aim,
        completion_xp: formData.completion_xp,
        completion_coins: formData.completion_coins,
        thumbnail_url: formData.thumbnail_url,
        objectives,
        card_style: {
          banner_text: String(formData.cardBannerText || '').trim(),
          accent_color: String(formData.cardAccentColor || '').trim(),
          background_color: String(formData.cardBackgroundColor || '').trim(),
          border_color: String(formData.cardBorderColor || '').trim(),
          rotation: Number.isFinite(Number(formData.cardRotation)) ? Number(formData.cardRotation) : 0
        },
        ai_settings: {
          mood_style: formData.moodStyle || 'adaptive',
          quiz_enabled: Boolean(formData.quizEnabled) && formData.quizFrequency !== 'off',
          quiz_frequency: formData.quizEnabled ? formData.quizFrequency : 'off',
          quiz_difficulty: formData.quizDifficulty || 'mixed',
          quiz_style: formData.quizStyle || 'mcq',
          educator_tests: educatorTests,
          educator_pass_score: Math.max(1, Math.min(educatorTests.length || 1, Number(formData.educatorPassScore || 4)))
        }
      };
    };

    const handleSubmit = async (e) => {
      e.preventDefault();
      setLoading(true);
      setError('');
      setSuccess('');

      if (!accessToken) {
        setError('You must be signed in as an authorized admin to manage courses.');
        setLoading(false);
        return;
      }

      if (!formData.title.trim()) {
        setError('Title is required');
        setLoading(false);
        return;
      }

      if (!formData.ai_prompt.trim()) {
        setError('AI Prompt is required');
        setLoading(false);
        return;
      }

      if (!formData.topic.trim()) {
        setError('Topic is required');
        setLoading(false);
        return;
      }

      const incompleteTestQuestion = (formData.educatorTests || []).find((item) => {
        const hasAnyText = String(item.question || '').trim() || (item.options || []).some((option) => String(option || '').trim()) || String(item.explanation || '').trim();
        const hasAllOptions = Array.from({ length: 4 }, (_option, index) => String(item.options?.[index] || '').trim()).every(Boolean);
        return hasAnyText && (!String(item.question || '').trim() || !hasAllOptions);
      });

      if (incompleteTestQuestion) {
        setError('Every authored final-test question needs question text and all 4 options.');
        setLoading(false);
        return;
      }

      try {
        const payload = buildCoursePayload();
        const requestBody = isEditing ? Object.assign({ courseId: editingCourse.id }, payload) : payload;
        const response = await fetch('/api/admin/courses', {
          method: isEditing ? 'PATCH' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`
          },
          body: JSON.stringify(requestBody)
        });

        const responseText = await response.text();
        let result;

        try {
          result = responseText ? JSON.parse(responseText) : {};
        } catch (_parseError) {
          throw new Error(responseText || `Request failed with status ${response.status}`);
        }

        if (!response.ok || !result.success) {
          throw new Error(result?.error || `Request failed with status ${response.status}`);
        }

        setSuccess(`Course "${formData.title}" ${isEditing ? 'updated' : 'created'} successfully.`);
        loadedFormJsonRef.current = JSON.stringify(formData);
        clearDraft();
        if (!isEditing) {
          setFormData(initialState);
        }
        if (onSuccess) onSuccess(result.data);
        setTimeout(() => setSuccess(''), 3000);
      } catch (submitError) {
        console.error('Course save error:', submitError);
        setError(submitError?.message || 'An error occurred while saving the course');
      } finally {
        setLoading(false);
      }
    };

    const finalPreviewQuestions = previewQuestions();

    return (
      <React.Fragment>
      <div className="w-full max-w-3xl mx-auto p-6" data-name="course-form" data-file="components/admin/CourseForm.js">
        <div className="glass-panel p-8">
          <div className="mb-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-3xl font-bold tracking-tight mb-2">{isEditing ? 'Edit Course' : 'Create New Course'}</h2>
                <p className="text-gray-400 font-mono text-sm">{isEditing ? 'Update this learning path' : 'Add a course to the learning platform'}</p>
                <p className="mt-2 text-[11px] font-mono uppercase tracking-wider text-mcGreen">Draft autosaves on this device</p>
              </div>
              <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => {
                  clearDraft();
                  setSuccess('Local draft cleared.');
                }}
                className="px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-gray-300 font-mono text-xs uppercase tracking-wider hover:bg-white/20 transition-colors"
              >
                Clear Draft
              </button>
              {isEditing ? (
                <button
                  type="button"
                  onClick={onCancelEdit}
                  className="px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-gray-300 font-mono text-xs uppercase tracking-wider hover:bg-white/20 transition-colors"
                >
                  Cancel
                </button>
              ) : null}
              </div>
            </div>
          </div>

          {error ? (
            <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-mono">
              {error}
            </div>
          ) : null}

          {success ? (
            <div className="mb-6 p-4 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-sm font-mono">
              {success}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-mono font-bold text-gray-300 uppercase tracking-wider mb-2">Course Title *</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g., Algebra Fundamentals"
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-neonViolet focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-mono font-bold text-gray-300 uppercase tracking-wider mb-2">Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="What will students learn?"
                rows="3"
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-neonViolet focus:outline-none transition-colors resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-mono font-bold text-gray-300 uppercase tracking-wider mb-2">Subject *</label>
                <select
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-neonViolet focus:outline-none transition-colors"
                >
                  {subjects.map((subject) => (
                    <option key={subject} value={subject} className="bg-black text-white">{subject}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-mono font-bold text-gray-300 uppercase tracking-wider mb-2">Grade *</label>
                <select
                  name="grade"
                  value={formData.grade}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-neonViolet focus:outline-none transition-colors"
                >
                  {grades.map((grade) => (
                    <option key={grade} value={grade} className="bg-black text-white">Grade {grade}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-mono font-bold text-gray-300 uppercase tracking-wider mb-2">Topic *</label>
              <input
                type="text"
                name="topic"
                value={formData.topic}
                onChange={handleChange}
                placeholder="e.g., Linear Equations"
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-neonViolet focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-mono font-bold text-gray-300 uppercase tracking-wider mb-2">Difficulty</label>
              <select
                name="difficulty"
                value={formData.difficulty}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-neonViolet focus:outline-none transition-colors"
              >
                {difficulties.map((difficulty) => (
                  <option key={difficulty} value={difficulty} className="bg-black text-white">
                    {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-mono font-bold text-gray-300 uppercase tracking-wider mb-2">AI Prompt (System Instruction) *</label>
              <textarea
                name="ai_prompt"
                value={formData.ai_prompt}
                onChange={handleChange}
                placeholder="e.g., You are a mathematics tutor for grade 9 students..."
                rows="4"
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-neonViolet focus:outline-none transition-colors resize-none font-mono text-xs"
              />
            </div>

            <div>
              <label className="block text-sm font-mono font-bold text-gray-300 uppercase tracking-wider mb-2">Learning Objective</label>
              <input
                type="text"
                name="ai_aim"
                value={formData.ai_aim}
                onChange={handleChange}
                placeholder="e.g., Help students solve linear equations confidently"
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-neonViolet focus:outline-none transition-colors"
              />
            </div>

            <div className="space-y-4 rounded-xl border border-white/10 bg-black/20 p-4">
              <div>
                <h3 className="text-lg font-bold tracking-tight mb-1">Buddy_AI Behavior</h3>
                <p className="text-xs text-gray-400 font-mono">Tune the chat personality and quiz cadence for this course.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-mono font-bold text-gray-300 uppercase tracking-wider mb-2">Mood Style</label>
                  <select
                    name="moodStyle"
                    value={formData.moodStyle}
                    onChange={handleChange}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-neonViolet focus:outline-none transition-colors"
                  >
                    {moodStyles.map((style) => (
                      <option key={style} value={style} className="bg-black text-white">
                        {style.charAt(0).toUpperCase() + style.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                <label className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm font-mono text-gray-300">
                  <input
                    type="checkbox"
                    name="quizEnabled"
                    checked={formData.quizEnabled}
                    onChange={handleChange}
                    className="h-4 w-4 accent-neonViolet"
                  />
                  Enable chat quizzes
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-mono font-bold text-gray-300 uppercase tracking-wider mb-2">Quiz Timing</label>
                  <select
                    name="quizFrequency"
                    value={formData.quizFrequency}
                    onChange={handleChange}
                    disabled={!formData.quizEnabled}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-neonViolet focus:outline-none transition-colors disabled:opacity-50"
                  >
                    {quizFrequencies.map((item) => (
                      <option key={item.value} value={item.value} className="bg-black text-white">{item.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-mono font-bold text-gray-300 uppercase tracking-wider mb-2">Quiz Difficulty</label>
                  <select
                    name="quizDifficulty"
                    value={formData.quizDifficulty}
                    onChange={handleChange}
                    disabled={!formData.quizEnabled}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-neonViolet focus:outline-none transition-colors disabled:opacity-50"
                  >
                    {quizDifficulties.map((difficulty) => (
                      <option key={difficulty} value={difficulty} className="bg-black text-white">
                        {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-4 rounded-xl border border-white/10 bg-black/20 p-4">
              <div>
                <label className="block text-sm font-mono font-bold text-gray-300 uppercase tracking-wider mb-2">Card Banner Text</label>
                <input
                  type="text"
                  name="cardBannerText"
                  value={formData.cardBannerText}
                  onChange={handleChange}
                  placeholder="e.g., Puzzle Path"
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-neonViolet focus:outline-none transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-mono font-bold text-gray-300 uppercase tracking-wider mb-2">Accent Color</label>
                  <input type="color" name="cardAccentColor" value={formData.cardAccentColor} onChange={handleChange} className="h-12 w-full cursor-pointer rounded-lg border border-white/10 bg-transparent p-1" />
                </div>
                <div>
                  <label className="block text-sm font-mono font-bold text-gray-300 uppercase tracking-wider mb-2">Card Background</label>
                  <input type="color" name="cardBackgroundColor" value={formData.cardBackgroundColor} onChange={handleChange} className="h-12 w-full cursor-pointer rounded-lg border border-white/10 bg-transparent p-1" />
                </div>
                <div>
                  <label className="block text-sm font-mono font-bold text-gray-300 uppercase tracking-wider mb-2">Card Border</label>
                  <input type="color" name="cardBorderColor" value={formData.cardBorderColor} onChange={handleChange} className="h-12 w-full cursor-pointer rounded-lg border border-white/10 bg-transparent p-1" />
                </div>
                <div>
                  <label className="block text-sm font-mono font-bold text-gray-300 uppercase tracking-wider mb-2">Card Rotation</label>
                  <input
                    type="number"
                    name="cardRotation"
                    value={formData.cardRotation}
                    onChange={handleChange}
                    min="-8"
                    max="8"
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-neonViolet focus:outline-none transition-colors"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-mono font-bold text-gray-300 uppercase tracking-wider mb-2">Objectives</label>
              <textarea
                name="objectivesText"
                value={formData.objectivesText}
                onChange={handleChange}
                placeholder="Write one objective per line."
                rows="5"
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-neonViolet focus:outline-none transition-colors resize-none font-mono text-xs"
              />
            </div>

            <div className="space-y-4 rounded-xl border border-white/10 bg-black/20 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-lg font-bold tracking-tight mb-1">Educator Final Test</h3>
                  <p className="text-xs text-gray-400 font-mono">Build MCQs here. These questions replace generated final-test questions for this course.</p>
                </div>
                <button
                  type="button"
                  onClick={addEducatorTest}
                  className="shrink-0 rounded-lg border border-neonViolet/50 bg-neonViolet/15 px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider text-neonViolet transition-colors hover:bg-neonViolet hover:text-black"
                >
                  Add Question
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewOpen(true)}
                  className="shrink-0 rounded-lg border border-blue-400/50 bg-blue-400/10 px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider text-blue-300 transition-colors hover:bg-blue-400 hover:text-black"
                >
                  Preview Test
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-[1fr_160px] gap-4">
                <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
                  <div className="text-xs font-mono uppercase tracking-wider text-gray-400">Question Count</div>
                  <div className="mt-1 text-2xl font-bold text-white">{(formData.educatorTests || []).length}</div>
                </div>
                <div>
                  <label className="block text-sm font-mono font-bold text-gray-300 uppercase tracking-wider mb-2">Pass Score</label>
                  <input
                    type="number"
                    name="educatorPassScore"
                    value={formData.educatorPassScore}
                    onChange={handleChange}
                    min="1"
                    max={Math.max(1, (formData.educatorTests || []).length)}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-neonViolet focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {(formData.educatorTests || []).length === 0 ? (
                <button
                  type="button"
                  onClick={addEducatorTest}
                  className="w-full rounded-lg border border-dashed border-white/20 bg-white/5 px-4 py-6 text-left transition-colors hover:border-neonViolet/60 hover:bg-neonViolet/10"
                >
                  <div className="font-bold text-white">No authored questions yet</div>
                  <div className="mt-1 text-xs font-mono text-gray-400">Add one question with four options to make the final test feel intentional.</div>
                </button>
              ) : null}

              <div className="space-y-4">
                {(formData.educatorTests || []).map((testQuestion, questionIndex) => (
                  <div key={`educator-test-${questionIndex}`} className="rounded-xl border border-white/10 bg-[#0b0d14] p-4 shadow-[0_12px_30px_rgba(0,0,0,0.22)]">
                    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-neonViolet">Question {questionIndex + 1}</div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => moveEducatorTest(questionIndex, -1)}
                          disabled={questionIndex === 0}
                          className="rounded-md border border-white/10 bg-white/5 px-3 py-1 text-xs font-mono text-gray-300 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Up
                        </button>
                        <button
                          type="button"
                          onClick={() => moveEducatorTest(questionIndex, 1)}
                          disabled={questionIndex === (formData.educatorTests || []).length - 1}
                          className="rounded-md border border-white/10 bg-white/5 px-3 py-1 text-xs font-mono text-gray-300 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Down
                        </button>
                        <button
                          type="button"
                          onClick={() => removeEducatorTest(questionIndex)}
                          className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-mono text-red-300 transition-colors hover:bg-red-500 hover:text-black"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    <label className="block text-sm font-mono font-bold text-gray-300 uppercase tracking-wider mb-2">Question</label>
                    <textarea
                      value={testQuestion.question}
                      onChange={(e) => updateEducatorTest(questionIndex, { question: e.target.value })}
                      placeholder="e.g., Which fraction is equivalent to 1/2?"
                      rows="2"
                      className="mb-4 w-full resize-none rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-gray-500 transition-colors focus:border-neonViolet focus:outline-none"
                    />

                    <div className="grid grid-cols-1 gap-3">
                      {Array.from({ length: 4 }, (_option, optionIndex) => {
                        const selected = Number(testQuestion.correct_index || 0) === optionIndex;
                        return (
                          <div
                            key={`educator-test-${questionIndex}-option-${optionIndex}`}
                            className={`grid grid-cols-[44px_1fr] items-center gap-3 rounded-lg border p-2 transition-colors ${selected ? 'border-mcGreen/70 bg-mcGreen/10' : 'border-white/10 bg-white/5'}`}
                          >
                            <button
                              type="button"
                              onClick={() => updateEducatorTest(questionIndex, { correct_index: optionIndex })}
                              className={`h-10 w-10 rounded-md border font-mono text-sm font-bold transition-colors ${selected ? 'border-mcGreen bg-mcGreen text-black' : 'border-white/10 bg-black/30 text-gray-300 hover:border-mcGreen/60 hover:text-mcGreen'}`}
                              title="Mark as correct answer"
                            >
                              {String.fromCharCode(65 + optionIndex)}
                            </button>
                            <input
                              type="text"
                              value={testQuestion.options?.[optionIndex] || ''}
                              onChange={(e) => updateEducatorTestOption(questionIndex, optionIndex, e.target.value)}
                              placeholder={`Option ${String.fromCharCode(65 + optionIndex)}`}
                              className="w-full rounded-md border border-white/10 bg-black/25 px-3 py-2 text-sm text-white placeholder-gray-500 transition-colors focus:border-neonViolet focus:outline-none"
                            />
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-4">
                      <label className="block text-sm font-mono font-bold text-gray-300 uppercase tracking-wider mb-2">Explanation</label>
                      <input
                        type="text"
                        value={testQuestion.explanation}
                        onChange={(e) => updateEducatorTest(questionIndex, { explanation: e.target.value })}
                        placeholder="Shown after the test is checked."
                        className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-gray-500 transition-colors focus:border-neonViolet focus:outline-none"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-mono font-bold text-gray-300 uppercase tracking-wider mb-2">Completion XP</label>
                <input
                  type="number"
                  name="completion_xp"
                  value={formData.completion_xp}
                  onChange={handleChange}
                  min="0"
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-neonViolet focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-mono font-bold text-gray-300 uppercase tracking-wider mb-2">Completion Coins</label>
                <input
                  type="number"
                  name="completion_coins"
                  value={formData.completion_coins}
                  onChange={handleChange}
                  min="0"
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-neonViolet focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-mono font-bold text-gray-300 uppercase tracking-wider mb-2">Thumbnail URL</label>
              <input
                type="text"
                name="thumbnail_url"
                value={formData.thumbnail_url}
                onChange={handleChange}
                placeholder="https://..."
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-neonViolet focus:outline-none transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg bg-neonViolet text-black font-mono font-bold uppercase tracking-wider transition-all hover:shadow-[0_0_15px_rgba(176,38,255,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (isEditing ? 'Saving Course...' : 'Creating Course...') : (isEditing ? 'Save Changes' : 'Create Course')}
            </button>
          </form>

          <div className="mt-8 p-4 rounded-lg bg-black/20 border border-white/10">
            <p className="text-xs text-gray-400 leading-relaxed">
              <strong>Fields marked with * are required.</strong> Courses for this admin page are currently limited to grades 6 to 9.
            </p>
          </div>
        </div>
      </div>
      {previewOpen ? (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" onClick={() => setPreviewOpen(false)}>
          <div className="max-h-[86vh] w-full max-w-4xl overflow-hidden rounded-2xl border border-white/10 bg-[#080a10] shadow-[0_20px_70px_rgba(0,0,0,0.6)]" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-white/10 p-5">
              <div>
                <div className="font-mono text-xs uppercase tracking-[0.25em] text-blue-300">Final Test Preview</div>
                <h2 className="text-2xl font-bold text-white">{formData.title || 'Untitled Course'} Final Test</h2>
                <p className="mt-1 text-xs font-mono text-gray-400">Pass score: {Math.max(1, Math.min(finalPreviewQuestions.length || 1, Number(formData.educatorPassScore || 4)))}/{finalPreviewQuestions.length || 1}</p>
              </div>
              <button type="button" onClick={() => setPreviewOpen(false)} className="rounded-lg bg-white/10 px-3 py-2 text-gray-300 hover:text-white">Close</button>
            </div>
            <div className="max-h-[calc(86vh-96px)] overflow-y-auto p-5 custom-scrollbar">
              {finalPreviewQuestions.length ? (
                <div className="space-y-4">
                  {finalPreviewQuestions.map((question, questionIndex) => (
                    <div key={`admin-preview-${questionIndex}`} className="rounded-xl border border-white/10 bg-black/25 p-4">
                      <div className="mb-3 font-bold text-white">{questionIndex + 1}. {question.question}</div>
                      <div className="space-y-2">
                        {question.options.map((option, optionIndex) => (
                          <div key={`admin-preview-${questionIndex}-${optionIndex}`} className={`rounded-lg border px-3 py-2 text-sm ${question.correct_index === optionIndex ? 'border-mcGreen/60 bg-mcGreen/10 text-mcGreen' : 'border-white/10 bg-white/5 text-gray-200'}`}>
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
  } catch (error) {
    console.error('CourseForm error:', error);
    return null;
  }
}
