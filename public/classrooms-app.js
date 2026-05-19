function ClassroomsApp() {
  const [user, setUser] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [rooms, setRooms] = React.useState([]);

  React.useEffect(() => {
    if (!supabaseClient) return;
    supabaseClient.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        window.location.href = 'login.html';
        return;
      }
      setUser(session.user);
      try {
        const response = await fetch(`/api/profile?mode=student_classrooms&userId=${encodeURIComponent(session.user.id)}&email=${encodeURIComponent(session.user.email || '')}`);
        const payload = await response.json();
        if (!response.ok || !payload?.success) throw new Error(payload?.error || 'Could not load classrooms.');
        setRooms(payload.data?.studentClassrooms?.classrooms || []);
      } catch (error) {
        setError(error?.message || 'Could not load classrooms.');
      } finally {
        setLoading(false);
      }
    });
  }, []);

  if (loading) return <div className="flex min-h-screen items-center justify-center font-mono">LOADING CLASSROOMS...</div>;

  return (
    <div className="min-h-screen p-4 sm:p-8">
      <header className="mx-auto mb-6 flex max-w-6xl items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <a href="profile.html" className="flex items-center gap-2 font-mono text-sm uppercase text-gray-400 hover:text-white"><div className="icon-arrow-left"></div> Profile</a>
        <h1 className="font-mono text-2xl font-bold tracking-[0.18em]">CLASSROOMS</h1>
        <div className="w-20"></div>
      </header>

      <main className="mx-auto max-w-6xl space-y-5">
        {error ? <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-300">{error}</div> : null}
        {!rooms.length ? <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-gray-400">You have not joined any classrooms yet. Use the + button on profile to join one.</div> : null}
        {rooms.map((room) => (
          <section key={room.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="font-mono text-xs uppercase tracking-[0.22em] text-neonViolet">Class {room.join_code}</div>
                <h2 className="text-2xl font-bold">{room.name}</h2>
                <p className="text-sm text-gray-400">{room.description || 'Classroom course list'}</p>
              </div>
              <div className="font-mono text-xs uppercase text-gray-500">{room.educator_display_name || room.educator_username || 'Educator'}</div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {(room.courses || []).map((course) => (
                <a key={course.id} href={`workspace.html?courseId=${encodeURIComponent(course.id)}`} className="rounded-xl border border-white/10 bg-black/20 p-4 transition hover:border-neonViolet/60">
                  <div className="font-bold">{course.title}</div>
                  <div className="mt-1 font-mono text-xs text-gray-500">{course.topic || course.subject}</div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-black/40">
                    <div className="h-full bg-neonViolet" style={{ width: `${course.completed ? 100 : Number(course.progress_percentage || 0)}%` }}></div>
                  </div>
                  <div className="mt-2 font-mono text-xs text-gray-500">{course.completed ? 'Completed' : `${Number(course.progress_percentage || 0)}% complete`} · no XP/coins</div>
                </a>
              ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<ClassroomsApp />);
