function SkillTree() {
  try {
    const nodes = [
      { id: 1, subject: "Mathematics", level: "Algebra Basics", status: "completed", icon: "icon-calculator" },
      { id: 2, subject: "Science", level: "Laws of Motion", status: "in-progress", icon: "icon-flask-conical" },
      { id: 3, subject: "English", level: "Grammar & Syntax", status: "locked", icon: "icon-book" }
    ];

    return (
      <div className="glass-panel p-6 sm:p-8 flex-1" data-name="skill-tree" data-file="components/profile/SkillTree.js">
        <h3 className="font-mono text-sm uppercase tracking-widest text-gray-400 mb-8 flex items-center gap-2">
          <div className="icon-network"></div> SKILL TREE
        </h3>

        <div className="relative pl-6 sm:pl-10 border-l-2 border-white/10 space-y-12">
          
          {nodes.map((node, idx) => (
            <div key={node.id} className="relative group">
              
              {/* Connector dot */}
              <div className={`absolute -left-[31px] sm:-left-[47px] top-4 w-5 h-5 rounded-full border-4 border-darkBg flex items-center justify-center
                ${node.status === 'completed' ? 'bg-neonViolet shadow-[0_0_12px_#b026ff]' : 
                  node.status === 'in-progress' ? 'bg-blue-500 shadow-[0_0_10px_#3b82f6] animate-pulse' : 'bg-gray-600'}`}>
                {node.status === 'completed' && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
              </div>

              <div className={`p-5 rounded-xl border transition-all duration-300
                ${node.status === 'completed' ? 'bg-neonViolet/5 border-neonViolet/30 hover:border-neonViolet/60' : 
                  node.status === 'in-progress' ? 'bg-blue-500/5 border-blue-500/30' : 'bg-black/20 border-white/5 grayscale opacity-60'}`}>
                
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-black/40 ${node.status === 'completed' ? 'text-neonViolet' : node.status === 'in-progress' ? 'text-blue-400' : 'text-gray-500'}`}>
                      <div className={node.icon}></div>
                    </div>
                    <div>
                      <h4 className="font-bold text-lg">{node.subject}</h4>
                      <p className="text-sm font-mono text-gray-400">{node.level}</p>
                    </div>
                  </div>
                  
                  {node.status === 'locked' ? (
                    <div className="w-8 h-8 rounded-full bg-black/40 flex items-center justify-center border border-white/10">
                      <div className="icon-lock text-gray-500 text-sm"></div>
                    </div>
                  ) : node.status === 'completed' ? (
                    <div className="text-neonViolet font-mono text-xs border border-neonViolet/30 px-2 py-1 rounded bg-neonViolet/10">MASTERED</div>
                  ) : (
                    <div className="text-blue-400 font-mono text-xs border border-blue-400/30 px-2 py-1 rounded bg-blue-400/10">ACTIVE</div>
                  )}
                </div>

                {node.status === 'in-progress' && (
                  <div className="mt-4">
                    <div className="flex justify-between text-xs font-mono text-gray-400 mb-1">
                      <span>Progress</span>
                      <span>65%</span>
                    </div>
                    <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 w-[65%] shadow-[0_0_8px_#3b82f6]"></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

        </div>
      </div>
    );
  } catch (error) {
    console.error('SkillTree error:', error);
    return null;
  }
}