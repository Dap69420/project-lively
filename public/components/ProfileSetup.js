function ProfileSetup({ user, onComplete }) {
  try {
    const [userType, setUserType] = React.useState(null);
    const [grade, setGrade] = React.useState(null);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState('');

    const grades = ['6', '7', '8', '9'];

    const handleComplete = async () => {
      const needsGrade = userType === 'student';
      if (!userType || (needsGrade && !grade)) {
        setError(needsGrade ? 'Please select both user type and grade' : 'Please select a role');
        return;
      }

      setLoading(true);
      setError('');

      try {
        if (supabaseClient) {
          const { error: updateError } = await supabaseClient.auth.updateUser({
            data: {
              userType,
              grade: userType === 'student' ? grade : '',
              alias: user?.user_metadata?.alias || user?.email?.split('@')[0] || 'RECRUIT',
              setupComplete: true
            }
          });

          if (updateError) {
            setError(updateError.message || 'Failed to save profile. Please try again.');
            console.error('Update error:', updateError);
            setLoading(false);
            return;
          }

          if (onComplete) {
            onComplete();
          }
        }
      } catch (err) {
        console.error('Profile setup error:', err);
        setError('An error occurred. Please try again.');
        setLoading(false);
      }
    };

    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="glass-panel w-full max-w-md p-8 space-y-6">
          
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-white">Welcome to Project Lively</h1>
            <p className="text-sm text-gray-400 font-mono uppercase tracking-wider">Let's customize your profile</p>
          </div>

          {/* Error message */}
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-mono">
              {error}
            </div>
          )}

          {/* User Type Selection */}
          <div className="space-y-3">
            <label className="text-sm font-mono uppercase tracking-wider text-gray-300">I am a</label>
            <div className="grid grid-cols-1 gap-2">
              {['Student', 'Parent', 'Educator'].map((type) => (
                <button
                  key={type}
                  onClick={() => setUserType(type.toLowerCase())}
                  className={`p-4 rounded-lg border-2 transition-all font-mono uppercase tracking-wider text-sm font-semibold ${
                    userType === type.toLowerCase()
                      ? 'bg-neonViolet text-black border-neonViolet shadow-[0_0_15px_rgba(176,38,255,0.4)]'
                      : 'bg-white/5 text-gray-300 border-white/10 hover:border-white/20 hover:bg-white/10'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Grade Selection */}
          {userType === 'student' ? (
            <div className="space-y-3">
              <label className="text-sm font-mono uppercase tracking-wider text-gray-300">Grade Level</label>
              <div className="grid grid-cols-4 gap-2">
                {grades.map((g) => (
                  <button
                    key={g}
                    onClick={() => setGrade(g)}
                    className={`p-3 rounded-lg border-2 transition-all font-mono font-bold text-lg ${
                      grade === g
                        ? 'bg-neonViolet text-black border-neonViolet shadow-[0_0_15px_rgba(176,38,255,0.4)]'
                        : 'bg-white/5 text-gray-300 border-white/10 hover:border-white/20 hover:bg-white/10'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {/* Description */}
          <div className="p-4 rounded-lg bg-black/20 border border-white/10">
            <p className="text-xs text-gray-400 leading-relaxed">
            {userType === 'student' && 'As a student, you\'ll track your progress, earn XP, and access personalized learning paths.'}
              {userType === 'parent' && 'As a parent, you\'ll connect child accounts, monitor progress, and stay out of the student course flow.'}
              {userType === 'educator' && 'As an educator, you\'ll create content, manage learning paths, and track student progress.'}
              {!userType && 'Select your role to get started.'}
            </p>
          </div>

          {/* Complete Button */}
          <button
            onClick={handleComplete}
            disabled={!userType || (userType === 'student' && !grade) || loading}
            className="w-full py-3 rounded-lg bg-neonViolet text-black font-mono font-bold uppercase tracking-wider transition-all hover:shadow-[0_0_15px_rgba(176,38,255,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Setting up...' : 'Get Started'}
          </button>

        </div>
      </div>
    );
  } catch (error) {
    console.error('ProfileSetup error:', error);
    return null;
  }
}
