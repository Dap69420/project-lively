function CourseSelector() {
  try {
    const progress = window.LivelyProgress.useProgress();
    const currentCourse = window.LivelyProgress.getSelectedCourse();
    const courses = progress.availableCourses || [];
    const [activeTab, setActiveTab] = React.useState('recommended');
    const [browserOpen, setBrowserOpen] = React.useState(false);
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

    const isCourseCompleted = (course) => {
      const courseState = progress.courseProgress[course.id] || { mastery: 0, completed: false };
      return Boolean(courseState.completed);
    };
    const completedCourses = courses.filter(isCourseCompleted);
    const recommendedCourses = courses.filter((course) => !isCourseCompleted(course));
    const previewCourses = recommendedCourses.slice(0, 3);
    const modalCourses = activeTab === 'all'
      ? allCourses
      : activeTab === 'completed'
        ? completedCourses
        : recommendedCourses;

    const renderCourseCard = (course, compact = false) => {
      const isActive = course.id === progress.selectedCourse;
      const courseState = progress.courseProgress[course.id] || { xp: 0, mastery: 0, questions: 0, completed: false };
      const isCompleted = Boolean(courseState.completed);
      const finalTestStatus = courseState.stats?.finalTest?.status || '';
      const hasPendingFinalTest = !isCompleted && (finalTestStatus === 'in_progress' || courseState.stats?.finalTest?.draft);
      const cardStyle = course.cardStyle || {};
      const cardBackground = cardStyle.background_color || (isActive ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.20)');
      const cardBorder = cardStyle.border_color || (isActive ? 'var(--color-neonViolet)' : 'rgba(255,255,255,0.10)');
      const cardAccent = cardStyle.accent_color || 'var(--color-neonViolet)';
      return (
        <button
          key={course.id}
          onClick={() => {
            window.LivelyProgress.setSelectedCourse(course.id);
            if (browserOpen) setBrowserOpen(false);
          }}
          className={`text-left rounded-xl border transition-all duration-200 hover:translate-y-[-1px] overflow-hidden w-full min-w-0 ${compact ? 'p-3' : 'p-4'}`}
          style={{ backgroundColor: cardBackground, borderColor: cardBorder, boxShadow: isActive ? '0 0 18px rgba(176, 38, 255, 0.2)' : 'none' }}
        >
          <div className="flex items-center justify-between gap-2 mb-3 min-w-0">
            <div className="min-w-0 flex-1 pr-1">
              {cardStyle.banner_text ? (
                <div className="inline-flex mb-2 max-w-full rounded-full px-2 py-1 text-[9px] font-mono uppercase tracking-[0.08em] sm:tracking-[0.14em] truncate" style={{ backgroundColor: cardAccent, color: '#050505' }}>
                  {cardStyle.banner_text}
                </div>
              ) : null}
            </div>
            <div className="shrink-0">
              {isCompleted ? (
                <span className="text-[9px] sm:text-[10px] font-mono px-2 py-1 rounded-full bg-green-500/20 text-green-300 border border-green-500/30">COMPLETED</span>
              ) : hasPendingFinalTest ? (
                <span className="text-[9px] sm:text-[10px] font-mono px-2 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">TEST REMAINS</span>
              ) : isActive ? (
                <span className="text-[9px] sm:text-[10px] font-mono px-2 py-1 rounded-full bg-neonViolet/20 text-neonViolet border border-neonViolet/30">LIVE</span>
              ) : null}
            </div>
          </div>

          <div className="min-w-0">
            <div className={`${compact ? 'text-lg' : 'text-xl'} mb-1 ${course.tone}`}>
              <div className={course.icon}></div>
            </div>
            <div className="font-bold text-white text-base sm:text-sm leading-snug whitespace-normal break-words" title={course.name}>
              {course.name}
            </div>
            <div
              className="text-sm sm:text-xs font-mono text-gray-400 mt-1 leading-snug whitespace-normal break-words"
              title={course.focus}
              style={{
                display: '-webkit-box',
                WebkitLineClamp: compact ? 1 : 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden'
              }}
            >
              {course.focus}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 text-xs font-mono text-gray-400 mb-2 min-w-0">
            <span>{courseState.questions} chats</span>
            <span>{courseState.mastery}% mastery</span>
          </div>
          <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden">
            <div className="h-full bg-neonViolet" style={{ width: `${Math.min(100, courseState.mastery)}%` }}></div>
          </div>
        </button>
      );
    };

    if (progress.catalogStatus === 'loading') {
      return (
        <div className="glass-panel p-4 sm:p-6 min-w-0" data-name="course-selector" data-file="components/profile/CourseSelector.js">
          <div className="flex items-center justify-between gap-3 mb-5 sm:mb-6 min-w-0">
            <h3 className="min-w-0 font-mono text-xs sm:text-sm uppercase tracking-widest text-gray-400 flex items-center gap-2">
              <div className="icon-sparkles"></div> ACTIVE COURSES
            </h3>
            <span className="shrink-0 font-mono text-[10px] sm:text-xs text-gray-500 uppercase">Loading...</span>
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
        <div className="glass-panel p-4 sm:p-6 min-w-0" data-name="course-selector" data-file="components/profile/CourseSelector.js">
          <div className="flex items-center justify-between gap-3 mb-5 sm:mb-6 min-w-0">
            <h3 className="min-w-0 font-mono text-xs sm:text-sm uppercase tracking-widest text-gray-400 flex items-center gap-2">
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

    if (courses.length === 0 && activeTab === 'recommended') {
      return (
        <div className="glass-panel p-4 sm:p-6 min-w-0" data-name="course-selector" data-file="components/profile/CourseSelector.js">
          <div className="flex items-center justify-between gap-3 mb-5 sm:mb-6 min-w-0">
            <h3 className="min-w-0 font-mono text-xs sm:text-sm uppercase tracking-widest text-gray-400 flex items-center gap-2">
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

    return (
      <div className="glass-panel p-4 sm:p-6 min-w-0 overflow-hidden" data-name="course-selector" data-file="components/profile/CourseSelector.js">
        <div className="flex items-center justify-between gap-3 mb-5 sm:mb-6 min-w-0">
          <h3 className="min-w-0 font-mono text-xs sm:text-sm uppercase tracking-widest text-gray-400 flex items-center gap-2">
            <div className="icon-sparkles"></div> ACTIVE COURSE
          </h3>
          <span className="shrink-0 font-mono text-[10px] sm:text-xs text-gray-500 uppercase">Grade-based</span>
        </div>

        <div className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 p-3">
          <div className="min-w-0">
            <div className="font-mono text-xs uppercase tracking-widest text-gray-500">Recommended now</div>
            <div className="text-sm text-gray-300">{recommendedCourses.length} open courses / {completedCourses.length} completed</div>
          </div>
          <button
            type="button"
            onClick={() => {
              setActiveTab('recommended');
              setBrowserOpen(true);
            }}
            className="shrink-0 rounded-lg bg-neonViolet px-4 py-3 text-sm font-bold font-mono uppercase tracking-wider text-white hover:brightness-110"
          >
            Show More
          </button>
        </div>

        {previewCourses.length === 0 ? (
          <div className="p-4 rounded-xl border border-white/10 bg-black/20 text-sm text-gray-400 font-mono">
            No active courses left here. Open the browser to review completed courses or all courses.
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 min-w-0">
          {previewCourses.map((course) => renderCourseCard(course))}
        </div>

        <div className="mt-6 p-4 rounded-xl border border-white/10 bg-black/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 min-w-0">
          <div className="min-w-0">
            <div className="text-xs font-mono uppercase tracking-widest text-gray-500">Current focus</div>
            <div className="text-lg font-bold text-white break-words">{currentCourse.name}</div>
            <div className="text-sm text-gray-400 break-words">{currentCourse.focus}</div>
          </div>
          <a
            href={currentCourse.id ? `workspace.html?courseId=${encodeURIComponent(currentCourse.id)}` : 'workspace.html'}
            className="inline-flex items-center justify-center px-4 py-3 rounded-lg bg-neonViolet text-white font-bold font-mono text-sm uppercase tracking-wider hover:brightness-110 transition-colors"
          >
            {isCourseCompleted(currentCourse) ? 'Review Course' : 'Start Learning'}
          </a>
        </div>

        {browserOpen ? (
          <div className="fixed inset-0 z-[9997] flex items-center justify-center bg-black/75 p-3 sm:p-6 backdrop-blur-sm" onClick={() => setBrowserOpen(false)}>
            <div className="w-full max-w-5xl max-h-[88vh] overflow-hidden rounded-2xl border border-white/10 bg-darkBg shadow-[0_20px_70px_rgba(0,0,0,0.55)]" onClick={(event) => event.stopPropagation()}>
              <div className="flex items-center justify-between gap-3 border-b border-white/10 p-4 sm:p-5">
                <div>
                  <div className="font-mono text-xs uppercase tracking-[0.25em] text-neonViolet">Course Browser</div>
                  <h2 className="text-xl sm:text-2xl font-bold">Choose a Course</h2>
                </div>
                <button type="button" onClick={() => setBrowserOpen(false)} className="rounded-lg bg-white/10 p-3 text-gray-300 hover:text-white">
                  <div className="icon-x"></div>
                </button>
              </div>

              <div className="border-b border-white/10 p-3 sm:p-4">
                <div className="grid grid-cols-3 gap-1 rounded-xl border border-white/10 bg-black/20 p-1 w-full min-w-0 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setActiveTab('recommended')}
                    className={`min-w-0 rounded-lg px-1.5 sm:px-3 py-2 text-[10px] sm:text-xs font-mono uppercase tracking-wide sm:tracking-wider transition-colors text-center leading-tight ${activeTab === 'recommended' ? 'bg-neonViolet text-black' : 'bg-transparent text-gray-400 hover:text-white'}`}
                  >
                    Recommended
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('completed')}
                    className={`min-w-0 rounded-lg px-1.5 sm:px-3 py-2 text-[10px] sm:text-xs font-mono uppercase tracking-wide sm:tracking-wider transition-colors text-center leading-tight ${activeTab === 'completed' ? 'bg-neonViolet text-black' : 'bg-transparent text-gray-400 hover:text-white'}`}
                  >
                    Completed
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('all')}
                    className={`min-w-0 rounded-lg px-1.5 sm:px-3 py-2 text-[10px] sm:text-xs font-mono uppercase tracking-wide sm:tracking-wider transition-colors text-center leading-tight ${activeTab === 'all' ? 'bg-neonViolet text-black' : 'bg-transparent text-gray-400 hover:text-white'}`}
                  >
                    All Courses
                  </button>
                </div>
              </div>

              <div className="max-h-[calc(88vh-156px)] overflow-y-auto custom-scrollbar p-4">
                {modalCourses.length === 0 && activeTab === 'completed' ? (
                  <div className="p-4 rounded-xl border border-white/10 bg-black/20 text-sm text-gray-400 font-mono">
                    Completed courses will appear here after every objective is checked off.
                  </div>
                ) : null}
                {modalCourses.length === 0 && activeTab === 'recommended' ? (
                  <div className="p-4 rounded-xl border border-white/10 bg-black/20 text-sm text-gray-400 font-mono">
                    No active recommendations left. Try All Courses.
                  </div>
                ) : null}
                {modalCourses.length === 0 && activeTab === 'all' && allCoursesStatus === 'loading' ? (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div key={i} className="h-32 rounded-xl bg-black/20 border border-white/10 animate-pulse"></div>
                    ))}
                  </div>
                ) : null}
                {modalCourses.length === 0 && activeTab === 'all' && allCoursesStatus === 'error' ? (
                  <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/10 text-sm text-red-300 font-mono">
                    {allCoursesError || 'Unable to load all courses.'}
                  </div>
                ) : null}

                {modalCourses.length > 0 ? (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {modalCourses.map((course) => renderCourseCard(course, true))}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    );
  } catch (error) {
    console.error('CourseSelector error:', error);
    return null;
  }
}
