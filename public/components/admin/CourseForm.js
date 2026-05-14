function CourseForm({ adminKey, onSuccess }) {
  try {
    const [formData, setFormData] = React.useState({
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
    });

    const [loading, setLoading] = React.useState(false);
    const [success, setSuccess] = React.useState('');
    const [error, setError] = React.useState('');

    const subjects = ['Mathematics', 'Science', 'English', 'History', 'Physics', 'Chemistry', 'Biology'];
    const grades = ['6', '7', '8', '9', '10', '11', '12'];
    const difficulties = ['beginner', 'intermediate', 'advanced'];

    const handleChange = (e) => {
      const { name, value } = e.target;
      setFormData(prev => ({
        ...prev,
        [name]: ['completion_xp', 'completion_coins'].includes(name) ? parseInt(value) : value
      }));
    };

    const handleSubmit = async (e) => {
      e.preventDefault();
      setLoading(true);
      setError('');
      setSuccess('');

      // Validation
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
        const response = await fetch(`/api/admin/courses?adminKey=${adminKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });

        const result = await response.json();

        if (!result.success) {
          setError(result.error || 'Failed to create course');
          setLoading(false);
          return;
        }

        setSuccess(`✅ Course "${formData.title}" created successfully!`);
        setFormData({
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
        });

        if (onSuccess) onSuccess(result.data);

        setTimeout(() => setSuccess(''), 3000);
      } catch (err) {
        console.error('Course creation error:', err);
        setError('An error occurred while creating the course');
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="w-full max-w-2xl mx-auto p-6" data-name="course-form" data-file="components/admin/CourseForm.js">
        <div className="glass-panel p-8">
          
          {/* Header */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold tracking-tight mb-2">Create New Course</h2>
            <p className="text-gray-400 font-mono text-sm">Add a course to the learning platform</p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-mono">
              {error}
            </div>
          )}

          {/* Success Alert */}
          {success && (
            <div className="mb-6 p-4 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-sm font-mono">
              {success}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Title */}
            <div>
              <label className="block text-sm font-mono font-bold text-gray-300 uppercase tracking-wider mb-2">
                Course Title *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g., Algebra Fundamentals"
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-neonViolet focus:outline-none transition-colors"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-mono font-bold text-gray-300 uppercase tracking-wider mb-2">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="What will students learn?"
                rows="3"
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-neonViolet focus:outline-none transition-colors resize-none"
              />
            </div>

            {/* Subject and Grade Row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-mono font-bold text-gray-300 uppercase tracking-wider mb-2">
                  Subject *
                </label>
                <select
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-neonViolet focus:outline-none transition-colors"
                >
                  {subjects.map(s => (
                    <option key={s} value={s} className="bg-black text-white">{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-mono font-bold text-gray-300 uppercase tracking-wider mb-2">
                  Grade *
                </label>
                <select
                  name="grade"
                  value={formData.grade}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-neonViolet focus:outline-none transition-colors"
                >
                  {grades.map(g => (
                    <option key={g} value={g} className="bg-black text-white">Grade {g}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Topic */}
            <div>
              <label className="block text-sm font-mono font-bold text-gray-300 uppercase tracking-wider mb-2">
                Topic *
              </label>
              <input
                type="text"
                name="topic"
                value={formData.topic}
                onChange={handleChange}
                placeholder="e.g., Linear Equations"
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-neonViolet focus:outline-none transition-colors"
              />
            </div>

            {/* Difficulty */}
            <div>
              <label className="block text-sm font-mono font-bold text-gray-300 uppercase tracking-wider mb-2">
                Difficulty
              </label>
              <select
                name="difficulty"
                value={formData.difficulty}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-neonViolet focus:outline-none transition-colors"
              >
                {difficulties.map(d => (
                  <option key={d} value={d} className="bg-black text-white">{d.charAt(0).toUpperCase() + d.slice(1)}</option>
                ))}
              </select>
            </div>

            {/* AI Prompt */}
            <div>
              <label className="block text-sm font-mono font-bold text-gray-300 uppercase tracking-wider mb-2">
                AI Prompt (System Instruction) *
              </label>
              <textarea
                name="ai_prompt"
                value={formData.ai_prompt}
                onChange={handleChange}
                placeholder="e.g., You are a Mathematics tutor specializing in algebra for grade 9 students. Focus on explaining linear equations, solving for variables..."
                rows="4"
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-neonViolet focus:outline-none transition-colors resize-none font-mono text-xs"
              />
            </div>

            {/* AI Aim */}
            <div>
              <label className="block text-sm font-mono font-bold text-gray-300 uppercase tracking-wider mb-2">
                Learning Objective
              </label>
              <input
                type="text"
                name="ai_aim"
                value={formData.ai_aim}
                onChange={handleChange}
                placeholder="e.g., Help students understand and solve linear equations confidently"
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-neonViolet focus:outline-none transition-colors"
              />
            </div>

            {/* Rewards Row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-mono font-bold text-gray-300 uppercase tracking-wider mb-2">
                  Completion XP
                </label>
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
                <label className="block text-sm font-mono font-bold text-gray-300 uppercase tracking-wider mb-2">
                  Completion Coins
                </label>
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

            {/* Thumbnail URL */}
            <div>
              <label className="block text-sm font-mono font-bold text-gray-300 uppercase tracking-wider mb-2">
                Thumbnail URL
              </label>
              <input
                type="text"
                name="thumbnail_url"
                value={formData.thumbnail_url}
                onChange={handleChange}
                placeholder="https://..."
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-neonViolet focus:outline-none transition-colors"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg bg-neonViolet text-black font-mono font-bold uppercase tracking-wider transition-all hover:shadow-[0_0_15px_rgba(176,38,255,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating Course...' : 'Create Course'}
            </button>

          </form>

          {/* Info Box */}
          <div className="mt-8 p-4 rounded-lg bg-black/20 border border-white/10">
            <p className="text-xs text-gray-400 leading-relaxed">
              <strong>Fields marked with * are required.</strong> The AI Prompt is crucial - it determines how the AI tutor will behave for this course. Be specific about the subject, grade level, and focus areas.
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
