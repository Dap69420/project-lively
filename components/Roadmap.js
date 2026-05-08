function Roadmap() {
  try {
    const levels = [
      {
        level: "LEVEL 1",
        title: "Grades 6-9 Foundation",
        status: "LIVE NOW",
        active: true,
        icon: "icon-zap"
      },
      {
        level: "LEVEL 2",
        title: "Grade 10 Boards Prep",
        status: "BETA PHASE",
        active: false,
        icon: "icon-book-open"
      },
      {
        level: "LEVEL 3",
        title: "JEE/NEET Training",
        status: "COMING SOON",
        active: false,
        icon: "icon-rocket"
      }
    ];

    return (
      <section id="roadmap" className="w-full max-w-4xl mx-auto px-6 py-20" data-name="roadmap" data-file="components/Roadmap.js">
        
        <div className="mb-16 border-4 border-lime p-4 bg-black shadow-[8px_8px_0px_#ff00ff] inline-block transform -rotate-2">
          <h2 className="text-3xl md:text-5xl font-black text-white m-0">THE ROADMAP</h2>
        </div>

        <div className="space-y-12 relative before:absolute before:inset-0 before:ml-8 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-1 before:bg-white/20">
          
          {levels.map((item, index) => (
            <div key={index} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
              
              <div className="flex items-center justify-center w-16 h-16 rounded-none border-4 border-white bg-dark shadow-[4px_4px_0px_#ccff00] z-10 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                <div className={`${item.icon} text-2xl ${item.active ? 'text-lime animate-pulse' : 'text-gray-500'}`}></div>
              </div>

              <div className={`w-[calc(100%-5rem)] md:w-[calc(50%-3rem)] brutal-card ${item.active ? 'border-lime' : 'border-gray-600 opacity-80'}`}>
                <div className="flex justify-between items-start mb-2">
                  <span className={`font-mono font-bold text-sm ${item.active ? 'text-lime' : 'text-gray-400'}`}>
                    {item.level}
                  </span>
                  <span className={`text-xs px-2 py-1 font-bold border-2 ${item.active ? 'bg-hotpink text-white border-white' : 'bg-gray-800 text-gray-400 border-gray-600'}`}>
                    {item.status}
                  </span>
                </div>
                <h3 className="text-xl font-bold">{item.title}</h3>
              </div>

            </div>
          ))}

        </div>
      </section>
    );
  } catch (error) {
    console.error('Roadmap component error:', error);
    return null;
  }
}