function AvatarSection({ user }) {
  try {
    const progress = window.LivelyProgress.useProgress();
    const handleLogout = async () => {
      if (supabaseClient) {
        await supabaseClient.auth.signOut();
        window.location.href = 'index.html';
      }
    };
    
    const alias = user?.user_metadata?.alias || user?.email?.split('@')[0] || 'RECRUIT';

    return (
      <div className="glass-panel p-8 flex flex-col items-center justify-center relative overflow-hidden group" data-name="avatar-section" data-file="components/profile/AvatarSection.js">
        
        {/* Decorative background circle */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border border-glassBorder rounded-full border-dashed animate-[spin_20s_linear_infinite] opacity-50"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border border-neonViolet/30 rounded-full animate-[spin_15s_linear_infinite_reverse]"></div>

        <div className="relative w-56 h-56 rounded-full bg-black/40 border-2 border-neonViolet flex items-center justify-center shadow-[0_0_30px_rgba(176,38,255,0.2)] group-hover:shadow-[0_0_50px_rgba(176,38,255,0.4)] transition-all duration-500 z-10">
          
          {/* Placeholder for 3D character */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-neonViolet/40 group-hover:text-neonViolet/70 transition-colors">
            <div className="icon-user-round text-7xl mb-2"></div>
            <span className="font-mono text-xs tracking-widest">3D AVATAR</span>
          </div>

          {/* Level Badge */}
          <div className="absolute -bottom-4 bg-darkBg border-2 border-neonViolet text-white font-mono font-bold px-4 py-1 rounded-full text-sm shadow-[0_0_10px_rgba(176,38,255,0.5)]">
            LVL {progress.level}
          </div>
        </div>

        <div className="mt-10 text-center relative z-10">
          <h2 className="text-3xl font-bold tracking-tight mb-1">{alias}</h2>
          <div className="text-gray-400 font-mono text-sm uppercase tracking-widest flex items-center justify-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div> Online
          </div>
          <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-xs font-mono text-gray-300 uppercase tracking-wider">
            <div className="icon-book-open text-neonViolet"></div>
            {window.LivelyProgress.getSelectedCourse().name}
          </div>
          
          {/* User Type and Grade */}
          {user?.user_metadata?.userType && (
            <div className="mt-3 flex items-center justify-center gap-3">
              <div className="px-2 py-1 rounded bg-neonViolet/20 border border-neonViolet/50 text-xs font-mono font-semibold text-neonViolet uppercase">
                {user.user_metadata.userType}
              </div>
              {user?.user_metadata?.grade && (
                <div className="px-2 py-1 rounded bg-blue-500/20 border border-blue-500/50 text-xs font-mono font-semibold text-blue-400 uppercase">
                  Grade {user.user_metadata.grade}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-6 w-full flex gap-2 relative z-10">
          <button className="flex-1 py-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 font-mono text-sm tracking-wider transition-colors flex items-center justify-center gap-2">
            <div className="icon-settings text-sm"></div> CUSTOMIZE
          </button>
          <button onClick={handleLogout} className="py-3 px-4 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-mono text-sm transition-colors flex items-center justify-center">
            <div className="icon-log-out text-sm"></div>
          </button>
        </div>

        <div className="mt-4 w-full grid grid-cols-3 gap-2 relative z-10 text-center">
          <div className="rounded-lg border border-white/10 bg-black/20 p-3">
            <div className="text-lg font-bold text-neonViolet">{progress.xp}</div>
            <div className="text-[10px] font-mono text-gray-400 uppercase">XP</div>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/20 p-3">
            <div className="text-lg font-bold text-yellow-400">{progress.coins}</div>
            <div className="text-[10px] font-mono text-gray-400 uppercase">Coins</div>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/20 p-3">
            <div className="text-lg font-bold text-blue-400">{progress.streak}</div>
            <div className="text-[10px] font-mono text-gray-400 uppercase">Streak</div>
          </div>
        </div>

      </div>
    );
  } catch (error) {
    console.error('AvatarSection error:', error);
    return null;
  }
}