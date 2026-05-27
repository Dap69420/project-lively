function TheStory() {
  try {
    return (
      <div className="w-full max-w-3xl mx-auto" data-name="the-story" data-file="components/founders/TheStory.js">
        <h1 className="font-handwriting text-5xl md:text-6xl text-white mb-6" style={{ transform: 'rotate(-2deg)' }}>
          "Built from the ground up, under the radar."
        </h1>
        <p className="text-lg md:text-xl font-mono text-gray-300 leading-relaxed text-center">
          Vektra started as a late-night experiment to fix a broken learning system. No massive team, no corporate backing—just pure code and a belief that AI should feel like a brilliant buddy, not a boring textbook.
        </p>
      </div>
    );
  } catch (error) {
    console.error('TheStory component error:', error);
    return null;
  }
}