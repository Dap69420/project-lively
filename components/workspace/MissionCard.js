function MissionCard() {
  try {
    return (
      <div className="panel flex-1 m-4" data-name="mission-card" data-file="components/workspace/MissionCard.js">
        <div className="bg-discordDarkest p-3 border-b border-gray-700/50 flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-300">
            <div className="icon-target text-mcPurple"></div>
            <span className="font-mono text-sm font-bold uppercase tracking-wider">Current Mission</span>
          </div>
          <span className="bg-mcPurple/20 text-mcPurple px-2 py-0.5 rounded text-xs font-mono font-bold">+500 XP</span>
        </div>
        
        <div className="p-6 h-full flex flex-col justify-center items-center bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjIiIGZpbGw9IiMzMTMzMzgiLz48L3N2Zz4=')]">
          
          <div className="comic-card w-full max-w-md transform rotate-[-2deg] hover:rotate-0 transition-transform duration-300">
            {/* Comic Header */}
            <div className="bg-mcGreen text-black p-2 border-b-4 border-black mb-4 -mx-4 -mt-4 font-pixel text-2xl uppercase text-center tracking-widest">
              EPISODE 4: PHYSICS
            </div>
            
            <h2 className="font-black text-4xl uppercase leading-none mb-2">The Laws of Motion</h2>
            <div className="w-16 h-2 bg-mcPurple mb-4"></div>
            
            <p className="font-mono text-sm mb-6 leading-relaxed">
              Isaac Newton dropped the hottest rules of the universe. Your mission is to decode the First Law: <span className="bg-yellow-300 font-bold">Inertia</span>.
            </p>
            
            <div className="bg-gray-100 p-3 rounded border-2 border-black border-dashed">
              <p className="font-sans font-bold text-sm">Objective:</p>
              <ul className="list-disc pl-5 font-mono text-xs mt-1 space-y-1">
                <li>Explain why a skateboard stops moving.</li>
                <li>Give a real-world example of inertia.</li>
              </ul>
            </div>
            
            {/* Decorative corner element */}
            <div className="absolute -bottom-6 -right-6 w-20 h-20 bg-black rounded-full text-white font-pixel flex items-center justify-center text-xl transform -rotate-12 border-4 border-white shadow-lg">
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