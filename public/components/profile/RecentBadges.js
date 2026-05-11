function RecentBadges() {
  try {
    const progress = window.LivelyProgress.useProgress();
    const badgeMap = {
      'first-steps': { name: 'First Steps', icon: 'icon-sparkles', color: 'from-purple-500 to-neonViolet' },
      'level-3': { name: 'Level 3 Unlocked', icon: 'icon-trophy', color: 'from-blue-400 to-cyan-500' },
      'streak-3': { name: 'Three Day Streak', icon: 'icon-flame', color: 'from-orange-400 to-red-500' },
      'coin-runner': { name: 'Coin Runner', icon: 'icon-coins', color: 'from-yellow-400 to-amber-500' },
      'quiz-wins': { name: 'Quiz Wins', icon: 'icon-message-square', color: 'from-green-400 to-emerald-500' },
      'course-master': { name: 'Course Master', icon: 'icon-book-open', color: 'from-pink-400 to-fuchsia-500' }
    };
    const badges = progress.achievements.length > 0 ? progress.achievements.map((id) => badgeMap[id]).filter(Boolean) : [
      { name: 'No badges yet', icon: 'icon-circle-help', color: 'from-gray-400 to-gray-500' }
    ];

    return (
      <div className="glass-panel p-6" data-name="recent-badges" data-file="components/profile/RecentBadges.js">
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
    );
  } catch (error) {
    console.error('RecentBadges error:', error);
    return null;
  }
}