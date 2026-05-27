function Header({ user }) {
  try {
    const progress = window.LivelyProgress.useProgress();
    const nextLevel = window.LivelyProgress.getNextLevelXp(progress);
    const xpPercent = Math.max(0, Math.min(100, Math.round((Number(nextLevel.currentXp || 0) / Math.max(1, Number(nextLevel.nextLevelXp || 1))) * 100)));
    const handleLogout = async () => {
      if (supabaseClient) {
        await supabaseClient.auth.signOut();
        window.location.href = 'index.html';
      }
    };
    
    const alias = progress.username || user?.user_metadata?.alias || 'RECRUIT';
    const avatarUrl = progress.avatarUrl || '';

    return (
      <div className="w-full bg-discordDarker flex flex-col" data-name="workspace-header" data-file="components/workspace/Header.js">
        {/* Full width XP Bar */}
        <div className="w-full h-2 bg-discordDarkest">
          <div className="h-full bg-mcPurple transition-all duration-1000 relative" style={{ width: `${xpPercent}%` }}>
            <div className="absolute right-0 top-0 w-full h-full bg-white/20 animate-pulse"></div>
          </div>
        </div>
        
        <div className="min-h-14 px-3 sm:px-4 lg:px-6 py-2 flex flex-wrap gap-2 justify-between items-center border-b border-black/20">
          <div className="flex min-w-0 items-center gap-2 sm:gap-4">
            <a href="index.html" className="flex shrink-0 items-center justify-center w-9 h-9 rounded bg-discordDark hover:bg-gray-600 transition-colors" title="Home">
              <div className="icon-house text-gray-300"></div>
            </a>
            <a href="profile.html" data-avatar-shell="true" className="group relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-mcPurple/50 bg-discordDark shadow-[0_0_14px_rgba(170,0,170,0.18)] transition-all hover:-translate-y-0.5 hover:border-mcGreen hover:shadow-[0_0_18px_rgba(85,255,85,0.22)]" title="User Evolution Profile">
              {avatarUrl ? (
                <img src={avatarUrl} alt={`${alias} profile`} className="h-full w-full rounded-xl object-cover p-0.5" />
              ) : (
                <div className="icon-user text-gray-300"></div>
              )}
              <span className="absolute -bottom-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full border border-discordDarker bg-mcGreen px-1 font-mono text-[9px] font-black text-black">
                {nextLevel.currentLevel}
              </span>
            </a>
            <h1 className="min-w-0 font-pixel text-xl sm:text-2xl lg:text-3xl text-white tracking-wider flex items-center gap-2 sm:ml-2">
              <div className="hidden sm:block w-4 h-4 bg-mcGreen"></div>
              <span className="truncate max-w-[9rem] sm:max-w-[18rem] lg:max-w-none">{alias.toUpperCase()}_WORKSPACE</span>
            </h1>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3 lg:gap-6 overflow-x-auto max-w-full custom-scrollbar">
            <button onClick={handleLogout} className="shrink-0 font-mono text-[10px] sm:text-xs text-red-400 hover:text-red-300 transition-colors uppercase border border-red-900/50 px-2 sm:px-3 py-1 rounded bg-red-950/20">
              LOGOUT
            </button>
            <div className="shrink-0 flex items-center gap-2 bg-discordDarkest px-2 sm:px-3 py-1.5 rounded-lg border border-gray-700">
              <span className="font-mono text-sm text-gray-400">LVL</span>
              <span className="font-pixel text-2xl text-mcPurple">{nextLevel.currentLevel}</span>
              <div className="w-px h-4 bg-gray-700 mx-2"></div>
              <span className="hidden sm:inline font-mono text-xs text-gray-300">{progress.xp.toLocaleString()} / {nextLevel.nextLevelXp.toLocaleString()} XP</span>
            </div>

            <div className="shrink-0 flex items-center gap-2 text-yellow-300 bg-yellow-400/10 px-2 sm:px-3 py-1.5 rounded-lg border border-yellow-400/30" title="Coins">
              <div className="icon-coins text-sm"></div>
              <span className="font-pixel text-2xl">{Number(progress.coins || 0).toLocaleString()}</span>
            </div>
            
            <div className="shrink-0 flex items-center gap-2 text-mcOrange bg-mcOrange/10 px-2 sm:px-3 py-1.5 rounded-lg border border-mcOrange/30">
              <div className="icon-flame animate-pulse"></div>
              <span className="font-pixel text-2xl">{progress.streak}<span className="hidden sm:inline"> DAYS</span></span>
            </div>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error('Header error:', error);
    return null;
  }
}
