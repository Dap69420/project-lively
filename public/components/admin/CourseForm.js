function CourseForm({ accessToken, onSuccess }) {
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
      cardRotation: 0
    };

    const [formData, setFormData] = React.useState(initialState);
    const [loading, setLoading] = React.useState(false);
    const [success, setSuccess] = React.useState('');
    const [error, setError] = React.useState('');

    const subjects = ['Mathematics', 'Science', 'English', 'History', 'Physics', 'Chemistry', 'Biology'];
    const grades = ['6', '7', '8', '9'];
    const difficulties = ['beginner', 'intermediate', 'advanced'];

    const handleChange = (e) => {
      const { name, value } = e.target;
      setFormData((prev) => ({
        ...prev,
        [name]: ['completion_xp', 'completion_coins', 'cardRotation'].includes(name) ? parseInt(value || '0', 10) : value
      }));
    };

    const buildCoursePayload = () => {
      const objectives = String(formData.objectivesText || '')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

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
        }
      };
    };

    const handleSubmit = async (e) => {
      e.preventDefault();
      setLoading(true);
      setError('');
      setSuccess('');

      if (!accessToken) {
        setError('You must be signed in as an authorized admin to create courses.');
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

      try {
        const response = await fetch('/api/admin/courses', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`
          },
          body: JSON.stringify(buildCoursePayload())
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

        setSuccess(`Course "${formData.title}" created successfully.`);
        setFormData(initialState);
        if (onSuccess) onSuccess(result.data);
        setTimeout(() => setSuccess(''), 3000);
      } catch (submitError) {
        console.error('Course creation error:', submitError);
        setError(submitError?.message || 'An error occurred while creating the course');
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="w-full max-w-2xl mx-auto p-6" data-name="course-form" data-file="components/admin/CourseForm.js">
        <div className="glass-panel p-8">
          <div className="mb-8">
            <h2 className="text-3xl font-bold tracking-tight mb-2">Create New Course</h2>
            <p className="text-gray-400 font-mono text-sm">Add a course to the learning platform</p>
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
              {loading ? 'Creating Course...' : 'Create Course'}
            </button>
          </form>

          <div className="mt-8 p-4 rounded-lg bg-black/20 border border-white/10">
            <p className="text-xs text-gray-400 leading-relaxed">
              <strong>Fields marked with * are required.</strong> Courses for this admin page are currently limited to grades 6 to 9.
            </p>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error('CourseForm error:', error);
    return null;
  }
}
