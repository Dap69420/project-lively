const HERO_TAGLINES = [
  'MAKE LEARNING FUN.',
  'TURN HOMEWORK INTO WINS.',
  'STUDY SMARTER.',
  'BUILD BETTER HABITS.'
];

function Hero() {
  try {
    const progress = window.LivelyProgress?.useProgress ? window.LivelyProgress.useProgress() : {};
    const [user, setUser] = React.useState(null);
    const reducedMotion = typeof document !== 'undefined' && document.body.classList.contains('animations-reduced');
    const [taglineIndex, setTaglineIndex] = React.useState(0);
    const [taglineText, setTaglineText] = React.useState(HERO_TAGLINES[0]);
    const [isDeleting, setIsDeleting] = React.useState(false);
    const [isPaused, setIsPaused] = React.useState(reducedMotion);

    React.useEffect(() => {
      if (!window.supabaseClient) return;
      window.supabaseClient.auth.getSession().then(({ data: { session } }) => {
        setUser(session?.user || null);
      });
      const { data: { subscription } } = window.supabaseClient.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user || null);
      });
      return () => subscription.unsubscribe();
    }, []);

    React.useEffect(() => {
      if (reducedMotion) return undefined;

      const activeText = HERO_TAGLINES[taglineIndex] || HERO_TAGLINES[0];
      let timeoutId;

      if (isPaused) {
        timeoutId = window.setTimeout(() => {
          setIsPaused(false);
          setIsDeleting(true);
        }, 1100);
      } else if (!isDeleting && taglineText.length < activeText.length) {
        timeoutId = window.setTimeout(() => {
          setTaglineText(activeText.slice(0, taglineText.length + 1));
        }, taglineText.length < 4 ? 90 : 55);
      } else if (!isDeleting && taglineText.length === activeText.length) {
        timeoutId = window.setTimeout(() => {
          setIsPaused(true);
        }, 1300);
      } else if (isDeleting && taglineText.length > 0) {
        timeoutId = window.setTimeout(() => {
          setTaglineText(activeText.slice(0, taglineText.length - 1));
        }, 28);
      } else if (isDeleting && taglineText.length === 0) {
        timeoutId = window.setTimeout(() => {
          setIsDeleting(false);
          setTaglineIndex((current) => (current + 1) % HERO_TAGLINES.length);
        }, 240);
      }

      return () => window.clearTimeout(timeoutId);
    }, [reducedMotion, isDeleting, isPaused, taglineIndex, taglineText]);

    const isSignedIn = Boolean(user);
    const userType = String(user?.user_metadata?.userType || 'student').toLowerCase();
    const isDashboardUser = userType === 'educator' || userType === 'parent';
    const primaryHref = isSignedIn ? 'workspace.html' : 'login.html';
    const primaryText = isSignedIn ? 'CONTINUE LEARNING' : 'JOIN THE BETA';
    const secondaryText = isDashboardUser ? 'OPEN DASHBOARD' : 'OPEN PROFILE';

    return (
      <section className="w-full max-w-6xl mx-auto px-6 py-14 md:py-20 flex flex-col lg:flex-row items-center gap-12" data-name="hero" data-file="components/Hero.js">
        
        <div className="flex-1 space-y-8 relative z-10">
          <div className="inline-block brutal-badge bg-hotpink text-white border-white shadow-[4px_4px_0px_#ccff00] mb-4">
            <span className="flex items-center gap-2">
              <div className="icon-circle-alert text-sm"></div> Grade 6-9 Beta Live
            </span>
          </div>
          
          <h1 className="text-5xl md:text-7xl lg:text-[6.6rem] font-black leading-[0.9] text-white max-w-[14rem] md:max-w-[16rem] lg:max-w-[17rem]" style={{ textShadow: '4px 4px 0px #ff00ff' }}>
            VEKTRA
            <span className="relative mt-2 block h-[1.15em] md:h-[1.08em] overflow-hidden whitespace-nowrap text-[clamp(1.55rem,3.7vw,3.4rem)] md:text-[clamp(1.65rem,3.2vw,4.2rem)] leading-none">
              <span className="absolute inset-0 text-lime" style={{ textShadow: '4px 4px 0px #111111, 6px 6px 0px #ff00ff' }}>
                {reducedMotion ? HERO_TAGLINES[0] : `${taglineText}${isDeleting ? '' : '|'}`}
              </span>
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl font-mono text-gray-300 max-w-xl border-l-4 border-lime pl-4 mt-8 md:mt-10">
            Meet the first AI that doesn't just grade you—<span className="text-white font-bold bg-hotpink px-1 selection:bg-lime selection:text-black">it studies with you.</span>
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 pt-8 md:pt-10">
            <a href={primaryHref} className="brutal-btn-lime flex items-center justify-center gap-2 text-lg no-underline inline-flex">
              {primaryText} <div className="icon-arrow-right"></div>
            </a>
            {isSignedIn ? (
              <a href="profile.html" className="brutal-btn-pink flex items-center justify-center gap-2 text-lg no-underline inline-flex">
                <div className={isDashboardUser ? 'icon-layout-dashboard' : 'icon-user-round'}></div> {secondaryText}
              </a>
            ) : null}
          </div>
        </div>

        <div className="flex-1 w-full max-w-md relative mt-12 lg:mt-20">
          {/* Abstract graphic replacing an image */}
          <div className="aspect-square bg-dark border-8 border-lime shadow-[16px_16px_0px_#ff00ff] relative overflow-hidden group hover:scale-105 transition-transform duration-500">
            <div className="absolute inset-0 flex items-center justify-center">
               <div className="text-[12rem] text-white opacity-20 group-hover:scale-110 transition-transform duration-500 font-mono font-black">AI</div>
            </div>
            
            <div className="absolute top-4 left-4 bg-black border-2 border-white p-2 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
              <span className="font-mono text-xs font-bold text-white">LIVE SESSION</span>
            </div>

            {/* Chat bubbles */}
            <div className="absolute top-20 right-[-1rem] bg-white text-black font-bold p-3 border-4 border-black shadow-[4px_4px_0px_#ccff00] transform rotate-3">
              Explain quantum physics? 🧪
            </div>
            <div className="absolute bottom-20 left-4 bg-hotpink text-white font-bold p-3 border-4 border-white shadow-[4px_4px_0px_#ccff00] transform -rotate-2">
              Let's break it down! 🚀
            </div>
          </div>
        </div>
      </section>
    );
  } catch (error) {
    console.error('Hero component error:', error);
    return null;
  }
}
