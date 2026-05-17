function RecentBadges() {
  try {
    const progress = window.LivelyProgress.useProgress();
    const catalog = Array.isArray(progress.achievementCatalog) ? progress.achievementCatalog : [];
    const ownedSet = new Set(progress.achievements || []);
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
      <div className="glass-panel p-6 space-y-8" data-name="recent-badges" data-file="components/profile/RecentBadges.js">
        <div>
          <h3 className="font-mono text-sm uppercase tracking-widest text-gray-400 mb-6 flex items-center gap-2">
            <div className="icon-award"></div> RECENT BADGES
          </h3>

          <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar snap-x">
            {badges.map((badge, idx) => (
              <div key={idx} className="flex flex-col items-center gap-3 min-w-[100px] snap-center group">
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

        <div>
          <h3 className="font-mono text-sm uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
            <div className="icon-list-checks"></div> ACHIEVEMENT INDEX
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {achievementIndex.map((achievement) => {
              const owned = ownedSet.has(achievement.id);
              const badge = badgeMap[achievement.id] || achievement;
              return (
                <div key={achievement.id} className={`rounded-lg border p-3 transition-colors ${owned ? 'border-neonViolet/50 bg-neonViolet/10' : 'border-white/10 bg-black/20 opacity-75'}`}>
                  <div className="flex items-start gap-3">
                    <div className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${owned ? 'bg-neonViolet/20' : 'bg-white/5 grayscale'}`}>
                      <div className={`${badge.icon || 'icon-award'} text-xl ${owned ? 'text-white' : 'text-gray-500'}`}></div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="truncate text-sm font-bold text-white">{achievement.name || badge.name}</div>
                        <span className={`rounded px-2 py-0.5 text-[10px] font-mono ${owned ? 'bg-green-400/20 text-green-300' : 'bg-white/10 text-gray-400'}`}>
                          {owned ? 'OWNED' : 'LOCKED'}
                        </span>
                      </div>
                      <div className="mt-1 text-xs leading-relaxed text-gray-400">{describeRequirement(achievement)}</div>
                    </div>
                  </div>
                </div>
              );
            })}
            {achievementIndex.length === 0 ? (
              <div className="rounded-lg border border-white/10 bg-black/20 p-4 text-sm text-gray-400">No achievements available yet.</div>
            ) : null}
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error('RecentBadges error:', error);
    return null;
  }
}
