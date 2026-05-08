function RecentBadges() {
  try {
    const badges = [
      { name: "First Explanation", icon: "icon-message-square", color: "from-purple-500 to-neonViolet" },
      { name: "3-Day Streak", icon: "icon-flame", color: "from-orange-400 to-red-500" },
      { name: "Early Tester", icon: "icon-flask-conical", color: "from-blue-400 to-cyan-500" },
      { name: "Curious Mind", icon: "icon-circle-help", color: "from-green-400 to-emerald-500" },
      { name: "Problem Solver", icon: "icon-puzzle", color: "from-yellow-400 to-amber-500" }
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