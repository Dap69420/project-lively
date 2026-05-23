function AvatarSection({ user }) {
  try {
    const sanitizeUsername = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 24);
    const progress = window.LivelyProgress.useProgress();
    const [isEditing, setIsEditing] = React.useState(false);
    const [profileForm, setProfileForm] = React.useState({
      username: progress.username || progress.alias || '',
      displayName: progress.displayName || '',
      avatarUrl: progress.avatarUrl || ''
    });
    const [profileError, setProfileError] = React.useState('');
    const [savingProfile, setSavingProfile] = React.useState(false);

    React.useEffect(() => {
      setProfileForm({
        username: progress.username || progress.alias || '',
        displayName: progress.displayName || '',
        avatarUrl: progress.avatarUrl || ''
      });
    }, [progress.username, progress.displayName, progress.avatarUrl, progress.alias]);

    const handleLogout = async () => {
      if (supabaseClient) {
        await supabaseClient.auth.signOut();
        window.location.href = 'index.html';
      }
    };

    const handleAvatarFile = (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      if (!file.type.startsWith('image/')) {
        setProfileError('Choose an image file.');
        return;
      }
      if (file.size > 1000000) {
        setProfileError('Image is too large. Use something under 1 MB.');
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        setProfileForm((current) => Object.assign({}, current, { avatarUrl: String(reader.result || '') }));
        setProfileError('');
      };
      reader.readAsDataURL(file);
    };

    const saveProfile = async (event) => {
      event.preventDefault();
      setSavingProfile(true);
      setProfileError('');

      try {
        const nextUsername = sanitizeUsername(profileForm.username);
        if (nextUsername.length < 3) {
          setProfileError('Username must be at least 3 letters, numbers, or underscores.');
          setSavingProfile(false);
          return;
        }

        await window.LivelyProgress.updateUserProfile({
          username: nextUsername,
          displayName: profileForm.displayName || nextUsername,
          avatarUrl: profileForm.avatarUrl
        });
        setIsEditing(false);
      } catch (error) {
        setProfileError(error?.message || 'Failed to save profile.');
      } finally {
        setSavingProfile(false);
      }
    };
    
    const alias = progress.username || user?.user_metadata?.alias || 'RECRUIT';
    const displayName = progress.displayName || alias;
    const avatarUrl = progress.avatarUrl || '';

    return (
      <div className="glass-panel p-4 sm:p-8 flex flex-col items-center justify-center relative overflow-hidden group min-w-0" data-name="avatar-section" data-file="components/profile/AvatarSection.js">
        
        {/* Decorative background circle */}
        <div className="absolute top-16 left-1/2 -translate-x-1/2 w-48 h-48 sm:w-64 sm:h-64 border border-glassBorder rounded-full border-dashed animate-[spin_20s_linear_infinite] opacity-40"></div>
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-36 h-36 sm:w-48 sm:h-48 border border-neonViolet/30 rounded-full animate-[spin_15s_linear_infinite_reverse]"></div>

        <div
          className="relative w-32 h-32 sm:w-56 sm:h-56 rounded-full bg-black/40 border-2 border-neonViolet flex items-center justify-center shadow-[0_0_30px_rgba(176,38,255,0.2)] group-hover:shadow-[0_0_50px_rgba(176,38,255,0.4)] transition-all duration-500 z-10"
          data-avatar-shell="true"
        >
          
          {avatarUrl ? (
            <img src={avatarUrl} alt={`${alias} profile`} className="h-full w-full rounded-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-neonViolet/40 group-hover:text-neonViolet/70 transition-colors">
              <div className="icon-user-round text-5xl sm:text-7xl mb-1 sm:mb-2"></div>
              <span className="font-mono text-[10px] sm:text-xs tracking-widest">AVATAR</span>
            </div>
          )}

          {/* Level Badge */}
          <div className="absolute -bottom-3 sm:-bottom-4 bg-darkBg border-2 border-neonViolet text-white font-mono font-bold px-3 sm:px-4 py-1 rounded-full text-xs sm:text-sm shadow-[0_0_10px_rgba(176,38,255,0.5)]">
            LVL {progress.level}
          </div>
        </div>

        <div className="mt-7 sm:mt-10 text-center relative z-10 min-w-0 w-full">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-1 break-words">{displayName}</h2>
          <div className="text-neonViolet font-mono text-xs mb-2 break-words">@{alias}</div>
          <div className="text-gray-400 font-mono text-sm uppercase tracking-widest flex items-center justify-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div> Online
          </div>
          <div className="mt-4 max-w-full inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-[10px] sm:text-xs font-mono text-gray-300 uppercase tracking-wide sm:tracking-wider">
            <div className="icon-book-open text-neonViolet"></div>
            <span className="min-w-0 truncate">{window.LivelyProgress.getSelectedCourse().name}</span>
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
          <button onClick={() => setIsEditing(true)} className="min-w-0 flex-1 py-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 font-mono text-xs sm:text-sm tracking-wider transition-colors flex items-center justify-center gap-2">
            <div className="icon-settings text-sm"></div> CUSTOMIZE
          </button>
          <button onClick={handleLogout} className="py-3 px-4 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-mono text-sm transition-colors flex items-center justify-center">
            <div className="icon-log-out text-sm"></div>
          </button>
        </div>

        <div className="mt-4 w-full grid grid-cols-3 gap-2 relative z-10 text-center">
          <div className="min-w-0 rounded-lg border border-white/10 bg-black/20 p-2 sm:p-3">
            <div className="text-base sm:text-lg font-bold text-neonViolet truncate">{progress.xp}</div>
            <div className="text-[10px] font-mono text-gray-400 uppercase">XP</div>
          </div>
          <div className="min-w-0 rounded-lg border border-white/10 bg-black/20 p-2 sm:p-3">
            <div className="text-base sm:text-lg font-bold text-yellow-400 truncate">{progress.coins}</div>
            <div className="text-[10px] font-mono text-gray-400 uppercase">Coins</div>
          </div>
          <div className="min-w-0 rounded-lg border border-white/10 bg-black/20 p-2 sm:p-3">
            <div className="text-base sm:text-lg font-bold text-blue-400 truncate">{progress.streak}</div>
            <div className="text-[10px] font-mono text-gray-400 uppercase">Streak</div>
          </div>
        </div>

        {isEditing ? (
          <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={() => setIsEditing(false)}>
            <form onSubmit={saveProfile} className="w-full max-w-md rounded-2xl border border-white/10 bg-darkBg p-6 shadow-[0_16px_40px_rgba(0,0,0,0.45)]" onClick={(event) => event.stopPropagation()}>
              <div className="mb-5 flex items-center justify-between">
                <h3 className="text-xl font-bold">Customize Profile</h3>
                <button type="button" onClick={() => setIsEditing(false)} className="text-gray-400 hover:text-white">
                  <div className="icon-x text-xl"></div>
                </button>
              </div>

              {profileError ? (
                <div className="mb-4 rounded border border-red-500/30 bg-red-500/10 p-3 text-xs font-mono text-red-300">{profileError}</div>
              ) : null}

              <div className="mb-4 flex items-center gap-4">
                <div className="h-20 w-20 overflow-hidden rounded-full border border-neonViolet bg-black/40 flex items-center justify-center" data-avatar-preview="true">
                  {profileForm.avatarUrl ? (
                    <img src={profileForm.avatarUrl} alt="Profile preview" className="h-full w-full object-cover" />
                  ) : (
                    <div className="icon-user-round text-3xl text-neonViolet/60"></div>
                  )}
                </div>
                <label className="flex-1 cursor-pointer rounded border border-white/10 bg-white/5 px-3 py-2 text-center text-xs font-mono uppercase tracking-wider text-gray-300 hover:bg-white/10">
                  Upload PFP
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarFile} />
                </label>
              </div>

              <label className="mb-3 block">
                <span className="mb-1 block text-xs font-mono uppercase tracking-wider text-gray-400">Unique username</span>
                <input
                  value={profileForm.username}
                  onChange={(event) => setProfileForm((current) => Object.assign({}, current, { username: sanitizeUsername(event.target.value) }))}
                  placeholder="physicsninja"
                  className="w-full rounded border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-neonViolet"
                  minLength="3"
                  maxLength="24"
                  required
                />
              </label>

              <label className="mb-5 block">
                <span className="mb-1 block text-xs font-mono uppercase tracking-wider text-gray-400">Display name</span>
                <input
                  value={profileForm.displayName}
                  onChange={(event) => setProfileForm((current) => Object.assign({}, current, { displayName: event.target.value }))}
                  placeholder="Physics Ninja"
                  className="w-full rounded border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-neonViolet"
                  maxLength="80"
                />
              </label>

              <button disabled={savingProfile} className="w-full rounded bg-neonViolet px-4 py-2 font-bold text-black hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">
                {savingProfile ? 'Saving...' : 'Save Profile'}
              </button>
            </form>
          </div>
        ) : null}

      </div>
    );
  } catch (error) {
    console.error('AvatarSection error:', error);
    return null;
  }
}
