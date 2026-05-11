function CourseSelector() {
  try {
    const progress = window.LivelyProgress.useProgress();
    const currentCourse = window.LivelyProgress.getSelectedCourse();

    return (
      <div className="glass-panel p-6" data-name="course-selector" data-file="components/profile/CourseSelector.js">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-mono text-sm uppercase tracking-widest text-gray-400 flex items-center gap-2">
            <div className="icon-sparkles"></div> ACTIVE COURSE
          </h3>
          <span className="font-mono text-xs text-gray-500 uppercase">Stored locally</span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {window.LivelyProgress.courses.map((course) => {
            const isActive = course.id === progress.selectedCourse;
            const courseState = progress.courseProgress[course.id] || { xp: 0, mastery: 0, questions: 0 };
            return (
              <button
                key={course.id}
                onClick={() => window.LivelyProgress.setSelectedCourse(course.id)}
                className={`text-left p-4 rounded-xl border transition-all duration-200 ${
                  isActive
                    ? 'bg-white/10 border-neonViolet shadow-[0_0_18px_rgba(176,38,255,0.2)] translate-y-[-1px]'
                    : 'bg-black/20 border-white/10 hover:border-white/20 hover:bg-white/5'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className={`text-2xl mb-1 ${course.tone}`}>
                      <div className={course.icon}></div>
                    </div>
                    <div className="font-bold text-white">{course.name}</div>
                    <div className="text-xs font-mono text-gray-400 mt-1">{course.focus}</div>
                  </div>
                  {isActive && <span className="text-[10px] font-mono px-2 py-1 rounded-full bg-neonViolet/20 text-neonViolet border border-neonViolet/30">LIVE</span>}
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
            href="workspace.html"
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
