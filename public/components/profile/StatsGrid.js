function StatsGrid() {
  try {
    const progress = window.LivelyProgress.useProgress();
    const nextLevel = window.LivelyProgress.getNextLevelXp(progress);
    const stats = [
      { label: "Brain Power", value: progress.xp.toLocaleString(), unit: "XP", icon: "icon-zap", color: "text-neonViolet", glow: "shadow-[0_0_15px_rgba(176,38,255,0.3)]" },
      { label: "Sync Streak", value: progress.streak.toString(), unit: "DAYS", icon: "icon-flame", color: "text-orange-400", glow: "shadow-[0_0_15px_rgba(251,146,60,0.2)]" },
      { label: "Coins", value: progress.coins.toLocaleString(), unit: "GOLD", icon: "icon-coin", color: "text-yellow-400", glow: "shadow-[0_0_15px_rgba(250,204,21,0.2)]" },
      { label: "Level", value: nextLevel.currentLevel.toString(), unit: `NEXT ${nextLevel.remaining} XP`, icon: "icon-trophy", color: "text-blue-400", glow: "shadow-[0_0_15px_rgba(96,165,250,0.2)]" }
    ];

    return (
      <div className="grid grid-cols-2 gap-3 sm:gap-6 min-w-0" data-name="stats-grid" data-file="components/profile/StatsGrid.js">
        {stats.map((stat, idx) => (
          <div key={idx} className="glass-panel p-3 sm:p-6 flex flex-col justify-between relative overflow-hidden group hover:-translate-y-1 min-w-0">
            
            {/* Subtle gradient background based on icon color */}
            <div className={`absolute -right-10 -top-10 w-32 h-32 rounded-full opacity-5 blur-2xl transition-opacity group-hover:opacity-20 ${stat.color.replace('text-', 'bg-')}`}></div>

            <div className="flex items-start justify-between mb-4 relative z-10">
              <span className="min-w-0 font-mono text-[10px] sm:text-sm text-gray-400 uppercase tracking-wide sm:tracking-wider leading-tight">{stat.label}</span>
              <div className={`w-8 h-8 rounded-full bg-black/40 border border-white/10 flex items-center justify-center ${stat.color} ${stat.glow}`}>
                <div className={`${stat.icon} text-sm`}></div>
              </div>
            </div>
            
            <div className="relative z-10">
              <div className="flex flex-col sm:flex-row sm:items-baseline gap-0 sm:gap-2 min-w-0">
                <span className="text-2xl sm:text-4xl font-bold tracking-tight truncate">{stat.value}</span>
                <span className="font-mono text-[10px] sm:text-xs text-gray-500 font-bold truncate">{stat.unit}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  } catch (error) {
    console.error('StatsGrid error:', error);
    return null;
  }
}
