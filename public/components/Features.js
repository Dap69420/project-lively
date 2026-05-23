function Features() {
  try {
    const features = [
      {
        title: "No More Exams",
        description: "Forget standard testing. The AI learns your unique style, pacing, and strengths over time.",
        icon: "icon-file-x",
        color: "lime"
      },
      {
        title: "The Socratic Buddy",
        description: "We don't give you answers. We ask 'Why?' and guide you until you're a certified pro.",
        icon: "icon-message-square",
        color: "pink"
      },
      {
        title: "Gamified Progress",
        description: "Earn XP, unlock achievements, and level up your avatar for explaining concepts clearly.",
        icon: "icon-gamepad-2",
        color: "lime"
      }
    ];

    return (
      <section id="features" className="w-full max-w-6xl mx-auto px-6 py-20 relative z-10" data-name="features" data-file="components/Features.js">
        
        <div className="mb-16 text-center">
          <h2 className="text-4xl md:text-5xl font-black text-white inline-block border-b-8 border-hotpink pb-2">
            THE <span className="text-lime">VEKTRA</span> DIFFERENCE
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
          {features.map((feature, index) => (
            <div key={index} className={`brutal-card ${feature.color === 'pink' ? 'brutal-card-pink' : ''} group hover:-translate-y-4 hover:shadow-[12px_12px_0px_rgba(255,0,255,0.8)] transition-all duration-500`}>
              
              <div className={`w-16 h-16 border-4 border-black flex items-center justify-center mb-6 transition-transform duration-500 group-hover:rotate-12
                ${feature.color === 'lime' ? 'bg-lime shadow-[4px_4px_0px_#ff00ff]' : 'bg-hotpink shadow-[4px_4px_0px_#ccff00]'}`}>
                <div className={`${feature.icon} text-3xl ${feature.color === 'lime' ? 'text-black' : 'text-white'} group-hover:scale-110 transition-transform duration-500`}></div>
              </div>
              
              <h3 className="text-2xl font-bold mb-4 uppercase">{feature.title}</h3>
              <p className="font-mono text-gray-300 leading-relaxed text-sm">
                {feature.description}
              </p>
              
              {/* Decorative corner element */}
              <div className="absolute top-0 right-0 w-8 h-8 bg-black border-l-4 border-b-4 border-white"></div>
            </div>
          ))}
        </div>
        
      </section>
    );
  } catch (error) {
    console.error('Features component error:', error);
    return null;
  }
}