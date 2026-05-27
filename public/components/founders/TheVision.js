function TheVision() {
  try {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8" data-name="the-vision" data-file="components/founders/TheVision.js">
        <div className="brutal-card group">
          <h3 className="text-2xl uppercase mb-4 text-lime flex items-center gap-2">
            <div className="icon-user"></div> Why I’m doing this alone
          </h3>
          <p className="font-mono text-sm text-gray-300 leading-relaxed">
            By staying independent, I can focus entirely on what students actually need, without answering to investors who only care about metrics. It’s raw, it’s unfiltered, and it evolves based entirely on user feedback.
          </p>
        </div>
        
        <div className="brutal-card group">
          <h3 className="text-2xl uppercase mb-4 text-hotpink flex items-center gap-2">
            <div className="icon-zap"></div> How we make AI lively
          </h3>
          <p className="font-mono text-sm text-gray-300 leading-relaxed">
            We don't feed answers; we prompt questions. The AI is designed to adapt its tone, gauge your frustration, and keep the momentum going like a co-op game mode rather than a pop quiz.
          </p>
        </div>
      </div>
    );
  } catch (error) {
    console.error('TheVision component error:', error);
    return null;
  }
}