function RecentBadges() {
  try {
    const progress = window.LivelyProgress.useProgress();
    const catalog = Array.isArray(progress.achievementCatalog) ? progress.achievementCatalog : [];
    const ownedSet = new Set(progress.achievements || []);
    const [indexOpen, setIndexOpen] = React.useState(false);
    const [selectedAchievementId, setSelectedAchievementId] = React.useState('');
    const badgeMap = {
      'first-steps': { name: 'First Steps', icon: 'icon-sparkles', color: 'from-purple-500 to-neonViolet' },
      'level-3': { name: 'Level 3 Unlocked', icon: 'icon-trophy', color: 'from-blue-400 to-cyan-500' },
      'streak-3': { name: 'Three Day Streak', icon: 'icon-flame', color: 'from-orange-400 to-red-500' },
      'coin-runner': { name: 'Coin Runner', icon: 'icon-coins', color: 'from-yellow-400 to-amber-500' },
      'quiz-wins': { name: 'Quiz Wins', icon: 'icon-message-square', color: 'from-green-400 to-emerald-500' },
      'course-master': { name: 'Course Master', icon: 'icon-book-open', color: 'from-pink-400 to-fuchsia-500' }
    };
    catalog.forEach((achievement) => {
      badgeMap[achievement.id] = {
        name: achievement.name,
        icon: achievement.icon || 'icon-award',
        color: achievement.color || 'from-purple-500 to-neonViolet'
      };
    });
    const badges = progress.achievements.length > 0 ? progress.achievements.map((id) => badgeMap[id]).filter(Boolean) : [
      { name: 'No badges yet', icon: 'icon-circle-help', color: 'from-gray-400 to-gray-500' }
    ];
    const fallbackCatalog = Object.entries(badgeMap).map(([id, badge], index) => ({
      id,
      name: badge.name,
      description: '',
      icon: badge.icon,
      color: badge.color,
      condition_type: '',
      condition_value: '',
      sort_index: index
    }));
    const achievementIndex = (catalog.length ? catalog : fallbackCatalog)
      .slice()
      .sort((a, b) => Number(a.sort_index || 0) - Number(b.sort_index || 0));
    const selectedAchievement = achievementIndex.find((achievement) => achievement.id === selectedAchievementId) || achievementIndex[0] || null;
    const conditionLabels = {
      total_xp: 'Earn XP',
      level: 'Reach level',
      streak: 'Keep a streak',
      coins: 'Collect coins',
      correct_answers: 'Answer correctly',
      courses_completed: 'Complete courses'
    };
    const describeRequirement = (achievement) => {
      if (achievement.description) return achievement.description;
      const label = conditionLabels[achievement.condition_type] || 'Unlock requirement';
      return achievement.condition_value ? `${label}: ${achievement.condition_value}` : 'Keep learning to unlock';
    };

    return (
      <div className="glass-panel p-4 sm:p-6 space-y-7 sm:space-y-8 min-w-0 overflow-hidden" data-name="recent-badges" data-file="components/profile/RecentBadges.js">
        <div>
          <h3 className="font-mono text-sm uppercase tracking-widest text-gray-400 mb-6 flex items-center gap-2">
            <div className="icon-award"></div> RECENT BADGES
          </h3>

          <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 custom-scrollbar snap-x max-w-full">
            {badges.map((badge, idx) => (
              <div key={idx} className="flex flex-col items-center gap-3 min-w-[84px] sm:min-w-[100px] snap-center group">
                <div className="relative w-16 h-16 rounded-full p-0.5 bg-gradient-to-br transition-transform group-hover:scale-110 group-hover:shadow-[0_0_15px_rgba(255,255,255,0.2)]" style={{ backgroundImage: `linear-gradient(to bottom right, var(--tw-gradient-stops))` }}>
                  <div className={`absolute inset-0 bg-gradient-to-br ${badge.color} rounded-full`}></div>
                  <div className="absolute inset-[2px] bg-darkBg rounded-full flex items-center justify-center">
                    <div className={`absolute inset-0 bg-gradient-to-br ${badge.color} opacity-20 rounded-full`}></div>
                    <div className={`${badge.icon} text-2xl text-white relative z-10 drop-shadow-md`}></div>
                  </div>
                </div>
                <span className="text-xs font-mono text-center text-gray-400 group-hover:text-white transition-colors leading-tight">
                  {badge.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/20 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h3 className="font-mono text-sm uppercase tracking-widest text-gray-400 flex items-center gap-2">
                <div className="icon-list-checks"></div> Achievement Index
              </h3>
              <p className="mt-1 text-xs font-mono text-gray-500">
                {ownedSet.size} owned / {achievementIndex.length} total
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedAchievementId(selectedAchievementId || achievementIndex[0]?.id || '');
                setIndexOpen(true);
              }}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-neonViolet px-4 py-3 text-sm font-bold font-mono uppercase tracking-wider text-white hover:brightness-110"
            >
              <div className="icon-panel-top-open"></div>
              Open Index
            </button>
          </div>
        </div>

        {indexOpen ? (
          <div className="fixed inset-0 z-[10000] bg-black/75 backdrop-blur-sm" onClick={() => setIndexOpen(false)}>
            <div className="absolute left-1/2 top-1/2 w-[min(94vw,56rem)] max-h-[82vh] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-white/10 bg-darkBg shadow-[0_20px_70px_rgba(0,0,0,0.55)]" onClick={(event) => event.stopPropagation()}>
              <div className="flex items-center justify-between gap-3 border-b border-white/10 p-4 sm:p-5">
                <div>
                  <div className="font-mono text-xs uppercase tracking-[0.25em] text-neonViolet">Collection</div>
                  <h2 className="text-xl sm:text-2xl font-bold">Achievement Index</h2>
                </div>
                <button type="button" onClick={() => setIndexOpen(false)} className="rounded-lg bg-white/10 p-3 text-gray-300 hover:text-white">
                  <div className="icon-x"></div>
                </button>
              </div>

              <div className="grid max-h-[calc(82vh-82px)] grid-cols-1 overflow-y-auto custom-scrollbar md:grid-cols-[minmax(0,1.25fr)_minmax(260px,0.75fr)]">
                <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 lg:grid-cols-4">
                  {achievementIndex.map((achievement) => {
                    const owned = ownedSet.has(achievement.id);
                    const badge = badgeMap[achievement.id] || achievement;
                    const isSelected = selectedAchievement?.id === achievement.id;
                    return (
                      <button
                        key={achievement.id}
                        type="button"
                        onClick={() => setSelectedAchievementId(achievement.id)}
                        className={`min-w-0 rounded-xl border p-3 text-left transition-colors ${isSelected ? 'border-neonViolet bg-neonViolet/15' : owned ? 'border-neonViolet/40 bg-neonViolet/10' : 'border-white/10 bg-black/25 opacity-80'}`}
                      >
                        <div className={`mb-3 flex h-12 w-12 items-center justify-center rounded-full ${owned ? 'bg-neonViolet/25 text-white' : 'bg-white/5 text-gray-500 grayscale'}`}>
                          <div className={`${badge.icon || 'icon-award'} text-xl`}></div>
                        </div>
                        <div className="truncate text-sm font-bold text-white">{achievement.name || badge.name}</div>
                        <div className={`mt-2 inline-flex rounded px-2 py-0.5 text-[10px] font-mono ${owned ? 'bg-green-400/20 text-green-300' : 'bg-white/10 text-gray-400'}`}>
                          {owned ? 'OWNED' : 'LOCKED'}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <aside className="border-t border-white/10 bg-black/20 p-5 md:border-l md:border-t-0">
                  {selectedAchievement ? (() => {
                    const owned = ownedSet.has(selectedAchievement.id);
                    const badge = badgeMap[selectedAchievement.id] || selectedAchievement;
                    return (
                      <div>
                        <div className={`mb-4 flex h-16 w-16 items-center justify-center rounded-full ${owned ? 'bg-neonViolet/25 text-white' : 'bg-white/5 text-gray-500 grayscale'}`}>
                          <div className={`${badge.icon || 'icon-award'} text-2xl`}></div>
                        </div>
                        <div className="font-mono text-xs uppercase tracking-widest text-gray-500">Requirement</div>
                        <h3 className="mt-1 text-2xl font-bold">{selectedAchievement.name || badge.name}</h3>
                        <p className="mt-3 text-sm leading-relaxed text-gray-300">{describeRequirement(selectedAchievement)}</p>
                        <div className={`mt-5 inline-flex rounded px-3 py-1 text-xs font-mono ${owned ? 'bg-green-400/20 text-green-300' : 'bg-white/10 text-gray-400'}`}>
                          {owned ? 'Unlocked' : 'Still locked'}
                        </div>
                      </div>
                    );
                  })() : (
                    <div className="text-sm text-gray-400">No achievements available yet.</div>
                  )}
                </aside>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    );
  } catch (error) {
    console.error('RecentBadges error:', error);
    return null;
  }
}
