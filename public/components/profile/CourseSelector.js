function CourseSelector() {
  try {
    const progress = window.LivelyProgress.useProgress();
    const currentCourse = window.LivelyProgress.getSelectedCourse();
    const courses = progress.availableCourses || [];
    const [activeTab, setActiveTab] = React.useState('recommended');
    const [allCourses, setAllCourses] = React.useState([]);
    const [allCoursesStatus, setAllCoursesStatus] = React.useState('idle');
    const [allCoursesError, setAllCoursesError] = React.useState('');

    React.useEffect(() => {
      if (activeTab !== 'all') {
        return;
      }

      let cancelled = false;

      const loadAllCourses = async () => {
        setAllCoursesStatus('loading');
        setAllCoursesError('');

        try {
          const loadedCourses = await window.LivelyProgress.loadAllCourses();
          if (cancelled) return;
          setAllCourses(Array.isArray(loadedCourses) ? loadedCourses : []);
          setAllCoursesStatus('ready');
        } catch (error) {
          if (cancelled) return;
          setAllCoursesStatus('error');
          setAllCoursesError(error?.message || 'Failed to load all courses');
        }
      };

      if (allCourses.length === 0 || allCoursesStatus !== 'ready') {
        loadAllCourses();
      }

      return () => {
        cancelled = true;
      };
    }, [activeTab]);

    const visibleCourses = activeTab === 'all' ? allCourses : courses;

    if (progress.catalogStatus === 'loading') {
      return (
        <div className="glass-panel p-6" data-name="course-selector" data-file="components/profile/CourseSelector.js">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-mono text-sm uppercase tracking-widest text-gray-400 flex items-center gap-2">
              <div className="icon-sparkles"></div> ACTIVE COURSES
            </h3>
            <span className="font-mono text-xs text-gray-500 uppercase">Loading grade courses...</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 rounded-xl bg-black/20 border border-white/10 animate-pulse"></div>
            ))}
          </div>
        </div>
      );
    }

    if (progress.catalogStatus === 'error') {
      return (
        <div className="glass-panel p-6" data-name="course-selector" data-file="components/profile/CourseSelector.js">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-mono text-sm uppercase tracking-widest text-gray-400 flex items-center gap-2">
              <div className="icon-sparkles"></div> ACTIVE COURSES
            </h3>
            <span className="font-mono text-xs text-red-400 uppercase">Load failed</span>
          </div>
          <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/10 text-sm text-red-300 font-mono">
            {progress.catalogError || 'Unable to load courses for this grade.'}
          </div>
        </div>
      );
    }

    if (visibleCourses.length === 0 && activeTab === 'recommended') {
      return (
        <div className="glass-panel p-6" data-name="course-selector" data-file="components/profile/CourseSelector.js">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-mono text-sm uppercase tracking-widest text-gray-400 flex items-center gap-2">
              <div className="icon-sparkles"></div> ACTIVE COURSES
            </h3>
            <span className="font-mono text-xs text-gray-500 uppercase">No courses yet</span>
          </div>
          <div className="p-4 rounded-xl border border-white/10 bg-black/20 text-sm text-gray-400 font-mono">
            No courses are available for your grade yet.
          </div>
        </div>
      );
    }

    if (visibleCourses.length === 0 && activeTab === 'all' && allCoursesStatus === 'loading') {
      return (
        <div className="glass-panel p-6" data-name="course-selector" data-file="components/profile/CourseSelector.js">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-mono text-sm uppercase tracking-widest text-gray-400 flex items-center gap-2">
              <div className="icon-sparkles"></div> ACTIVE COURSES
            </h3>
            <span className="font-mono text-xs text-gray-500 uppercase">Loading all courses...</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 rounded-xl bg-black/20 border border-white/10 animate-pulse"></div>
            ))}
          </div>
        </div>
      );
    }

    if (visibleCourses.length === 0 && activeTab === 'all' && allCoursesStatus === 'error') {
      return (
        <div className="glass-panel p-6" data-name="course-selector" data-file="components/profile/CourseSelector.js">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-mono text-sm uppercase tracking-widest text-gray-400 flex items-center gap-2">
              <div className="icon-sparkles"></div> ACTIVE COURSES
            </h3>
            <span className="font-mono text-xs text-red-400 uppercase">Load failed</span>
          </div>
          <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/10 text-sm text-red-300 font-mono">
            {allCoursesError || 'Unable to load all courses.'}
          </div>
        </div>
      );
    }

    return (
      <div className="glass-panel p-6" data-name="course-selector" data-file="components/profile/CourseSelector.js">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-mono text-sm uppercase tracking-widest text-gray-400 flex items-center gap-2">
            <div className="icon-sparkles"></div> ACTIVE COURSE
          </h3>
          <span className="font-mono text-xs text-gray-500 uppercase">Grade-based</span>
        </div>

        <div className="mb-5 flex gap-2 rounded-xl border border-white/10 bg-black/20 p-1">
          <button
            type="button"
            onClick={() => setActiveTab('recommended')}
            className={`flex-1 rounded-lg px-3 py-2 text-xs font-mono uppercase tracking-wider transition-colors ${activeTab === 'recommended' ? 'bg-neonViolet text-black' : 'bg-transparent text-gray-400 hover:text-white'}`}
          >
            Recommended
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`flex-1 rounded-lg px-3 py-2 text-xs font-mono uppercase tracking-wider transition-colors ${activeTab === 'all' ? 'bg-neonViolet text-black' : 'bg-transparent text-gray-400 hover:text-white'}`}
          >
            All Courses
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visibleCourses.map((course) => {
            const isActive = course.id === progress.selectedCourse;
            const courseState = progress.courseProgress[course.id] || { xp: 0, mastery: 0, questions: 0, completed: false };
            const isCompleted = Boolean(courseState.completed) || courseState.mastery >= 100;
            const cardStyle = course.cardStyle || {};
            const cardBackground = cardStyle.background_color || (isActive ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.20)');
            const cardBorder = cardStyle.border_color || (isActive ? 'var(--color-neonViolet)' : 'rgba(255,255,255,0.10)');
            const cardAccent = cardStyle.accent_color || 'var(--color-neonViolet)';
            return (
              <button
                key={course.id}
                onClick={() => window.LivelyProgress.setSelectedCourse(course.id)}
                className="text-left p-4 rounded-xl border transition-all duration-200 hover:translate-y-[-1px] overflow-hidden"
                style={{ backgroundColor: cardBackground, borderColor: cardBorder, boxShadow: isActive ? '0 0 18px rgba(176, 38, 255, 0.2)' : 'none' }}
              >
                <div className="flex items-start justify-between gap-3 mb-3 min-w-0">
                  <div className="min-w-0 flex-1">
                    {cardStyle.banner_text ? (
                      <div className="inline-flex mb-2 max-w-full rounded-full px-2 py-1 text-[10px] font-mono uppercase tracking-[0.18em] truncate" style={{ backgroundColor: cardAccent, color: '#050505' }}>
                        {cardStyle.banner_text}
                      </div>
                    ) : null}
                    <div className={`text-2xl mb-1 ${course.tone}`}>
                      <div className={course.icon}></div>
                    </div>
                    <div className="font-bold text-white break-words">{course.name}</div>
                    <div className="text-xs font-mono text-gray-400 mt-1 break-words">{course.focus}</div>
                  </div>
                  <div className="shrink-0">
                    {isCompleted ? (
                      <span className="text-[10px] font-mono px-2 py-1 rounded-full bg-green-500/20 text-green-300 border border-green-500/30">COMPLETED</span>
                    ) : isActive ? (
                      <span className="text-[10px] font-mono px-2 py-1 rounded-full bg-neonViolet/20 text-neonViolet border border-neonViolet/30">LIVE</span>
                    ) : null}
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs font-mono text-gray-400 mb-2">
                  <span>{courseState.questions} chats</span>
                  <span>{courseState.mastery}% mastery</span>
                </div>
                <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden">
                  <div className="h-full bg-neonViolet" style={{ width: `${Math.min(100, courseState.mastery)}%` }}></div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-6 p-4 rounded-xl border border-white/10 bg-black/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="text-xs font-mono uppercase tracking-widest text-gray-500">Current focus</div>
            <div className="text-lg font-bold text-white">{currentCourse.name}</div>
            <div className="text-sm text-gray-400">{currentCourse.focus}</div>
          </div>
          <a
            href={currentCourse.id ? `workspace.html?courseId=${encodeURIComponent(currentCourse.id)}` : 'workspace.html'}
            className="inline-flex items-center justify-center px-4 py-3 rounded-lg bg-neonViolet text-white font-bold font-mono text-sm uppercase tracking-wider hover:brightness-110 transition-colors"
          >
            Start Learning
          </a>
        </div>
      </div>
    );
  } catch (error) {
    console.error('CourseSelector error:', error);
    return null;
  }
}
