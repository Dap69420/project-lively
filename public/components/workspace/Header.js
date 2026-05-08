function Header() {
  try {
    return (
      <div className="w-full bg-discordDarker flex flex-col" data-name="workspace-header" data-file="components/workspace/Header.js">
        {/* Full width XP Bar */}
        <div className="w-full h-2 bg-discordDarkest">
          <div className="h-full bg-mcPurple w-[65%] transition-all duration-1000 relative">
            <div className="absolute right-0 top-0 w-full h-full bg-white/20 animate-pulse"></div>
          </div>
        </div>
        
        <div className="h-14 px-6 flex justify-between items-center border-b border-black/20">
          <div className="flex items-center gap-4">
            <a href="index.html" className="flex items-center justify-center w-8 h-8 rounded bg-discordDark hover:bg-gray-600 transition-colors" title="Home">
              <div className="icon-house text-gray-300"></div>
            </a>
            <a href="profile.html" className="flex items-center justify-center w-8 h-8 rounded bg-discordDark hover:bg-gray-600 transition-colors" title="User Evolution Profile">
              <div className="icon-user text-gray-300"></div>
            </a>
            <h1 className="font-pixel text-3xl text-white tracking-wider flex items-center gap-2 ml-2">
              <div className="w-4 h-4 bg-mcGreen"></div> LIVELY_WORKSPACE
            </h1>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 bg-discordDarkest px-3 py-1.5 rounded-lg border border-gray-700">
              <span className="font-mono text-sm text-gray-400">LVL</span>
              <span className="font-pixel text-2xl text-mcPurple">14</span>
              <div className="w-px h-4 bg-gray-700 mx-2"></div>
              <span className="font-mono text-xs text-gray-300">3,450 / 5,000 XP</span>
            </div>
            
            <div className="flex items-center gap-2 text-mcOrange bg-mcOrange/10 px-3 py-1.5 rounded-lg border border-mcOrange/30">
              <div className="icon-flame animate-pulse"></div>
              <span className="font-pixel text-2xl">12 DAYS</span>
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