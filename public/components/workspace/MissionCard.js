function MissionCard() {
  try {
    const progress = window.LivelyProgress.useProgress();
    const course = window.LivelyProgress.getSelectedCourse();
    const cardStyle = course.cardStyle || {};
    const lessonObjectives = Array.isArray(course.objectives) && course.objectives.length > 0
      ? course.objectives.slice(0, 4)
      : Array.isArray(course.lessons)
        ? course.lessons.slice(0, 2).map((lesson, index) => {
          if (typeof lesson === 'string') return lesson;
          return lesson.title || lesson.name || lesson.text || `Lesson ${index + 1}`;
        })
        : [];

    const mission = {
      episode: `GRADE ${course.grade || '--'} • ${String(course.subject || 'COURSE').toUpperCase()}`,
      title: course.name || 'Learning Path',
      body: course.aiAim || course.description || `Work through ${course.focus}.`,
      objectives: lessonObjectives.length > 0
        ? lessonObjectives
        : [
            `Complete ${course.completionXp || 250} XP in this course.`,
            `Explain ${course.focus} in your own words.`
          ]
    };

    const rotation = Number(cardStyle.rotation || 0);
    const cardBackground = cardStyle.background_color || '#f8f7f2';
    const cardAccent = cardStyle.accent_color || '#55ff55';
    const cardBorder = cardStyle.border_color || '#111111';
    const bannerText = cardStyle.banner_text || mission.episode;

    return (
      <div className="panel flex-1 m-4" data-name="mission-card" data-file="components/workspace/MissionCard.js">
        <div className="bg-discordDarkest p-3 border-b border-gray-700/50 flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-300">
            <div className="icon-target text-mcPurple"></div>
            <span className="font-mono text-sm font-bold uppercase tracking-wider">Current Mission</span>
          </div>
          <span className="bg-mcPurple/20 text-mcPurple px-2 py-0.5 rounded text-xs font-mono font-bold">LVL {progress.level}</span>
        </div>
        
        <div className="p-6 h-full flex flex-col justify-center items-center bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjIiIGZpbGw9IiMzMTMzMzgiLz48L3N2Zz4=')]">
          
          <div className="comic-card w-full max-w-md transform hover:rotate-0 transition-transform duration-300 overflow-hidden" style={{ transform: `rotate(${Number.isFinite(rotation) ? rotation : -2}deg)` }}>
            {/* Comic Header */}
            <div className="p-2 border-b-4 mb-4 -mx-4 -mt-4 font-pixel text-xl uppercase text-center tracking-widest truncate" style={{ backgroundColor: cardAccent, color: '#050505', borderBottomColor: cardBorder }}>
              {bannerText}
            </div>
            
            <h2 className="font-black text-2xl uppercase leading-tight mb-2 break-words" style={{ color: cardBorder }}>{mission.title}</h2>
            <div className="w-16 h-2 mb-4" style={{ backgroundColor: cardAccent }}></div>
            
            <p className="font-mono text-sm mb-6 leading-relaxed break-words" style={{ color: cardBorder }}>
              {mission.body} <span className="font-bold" style={{ backgroundColor: cardAccent, color: '#050505' }}>{course.name}</span>.
            </p>
            
            <div className="p-3 rounded border-2 border-dashed" style={{ backgroundColor: cardBackground, borderColor: cardBorder }}>
              <p className="font-sans font-bold text-sm">Objective:</p>
              <ul className="list-disc pl-5 font-mono text-xs mt-1 space-y-1">
                {mission.objectives.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
            
            {/* Decorative corner element */}
            <div className="absolute -bottom-6 -right-6 w-20 h-20 rounded-full text-white font-pixel flex items-center justify-center text-xl transform -rotate-12 border-4 shadow-lg" style={{ backgroundColor: cardBorder, borderColor: cardAccent }}>
              GO!
            </div>
          </div>
          
        </div>
      </div>
    );
  } catch (error) {
    console.error('MissionCard error:', error);
    return null;
  }
}