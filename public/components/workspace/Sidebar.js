function Sidebar({ user }) {
  try {
    const [activeTab, setActiveTab] = React.useState('notes');
    const progress = window.LivelyProgress.useProgress();
    const selectedCourseId = progress.selectedCourse || '';
    const selectedCourse = window.LivelyProgress.getSelectedCourse();
    const selectedCourseName = selectedCourse?.name || 'Course notes';
    const userId = user?.id || progress.userId || '';
    const userCourseId = selectedCourseId ? progress.courseProgress?.[selectedCourseId]?.userCourseId : null;
    const [notes, setNotes] = React.useState('');
    const [status, setStatus] = React.useState('idle');
    const [loadedKey, setLoadedKey] = React.useState('');
    const saveTimerRef = React.useRef(null);
    const lastSavedRef = React.useRef('');
    const currentKeyRef = React.useRef('');

    React.useEffect(() => {
      let cancelled = false;
      const key = userId && selectedCourseId ? `${userId}:${selectedCourseId}` : '';
      currentKeyRef.current = key;

      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }

      setLoadedKey('');
      lastSavedRef.current = '';

      if (!key) {
        setNotes('');
        setStatus('idle');
        return () => {
          cancelled = true;
        };
      }

      setNotes('');
      setStatus('loading');

      fetch(`/api/notes?userId=${encodeURIComponent(userId)}&courseId=${encodeURIComponent(selectedCourseId)}`)
        .then(async (response) => {
          const text = await response.text();
          const payload = text ? JSON.parse(text) : {};

          if (!response.ok) {
            throw new Error(payload?.error || `Request failed with status ${response.status}`);
          }

          return payload;
        })
        .then((payload) => {
          if (cancelled) return;
          const nextNotes = String(payload?.data?.content || '');
          lastSavedRef.current = nextNotes;
          setNotes(nextNotes);
          setLoadedKey(key);
          setStatus('saved');
        })
        .catch((error) => {
          if (cancelled) return;
          console.error('Failed to load notes:', error);
          setLoadedKey(key);
          setStatus('error');
        });

      return () => {
        cancelled = true;
      };
    }, [userId, selectedCourseId]);

    React.useEffect(() => {
      const key = userId && selectedCourseId ? `${userId}:${selectedCourseId}` : '';

      if (!key || loadedKey !== key || notes === lastSavedRef.current) {
        return;
      }

      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }

      setStatus('saving');
      saveTimerRef.current = setTimeout(() => {
        fetch(`/api/notes?userId=${encodeURIComponent(userId)}&courseId=${encodeURIComponent(selectedCourseId)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: notes,
            userCourseId: userCourseId || null
          })
        })
          .then(async (response) => {
            const text = await response.text();
            const payload = text ? JSON.parse(text) : {};

            if (!response.ok) {
              throw new Error(payload?.error || `Request failed with status ${response.status}`);
            }

            return payload;
          })
          .then(() => {
            if (currentKeyRef.current !== key) return;
            lastSavedRef.current = notes;
            setStatus('saved');
          })
          .catch((error) => {
            if (currentKeyRef.current !== key) return;
            console.error('Failed to save notes:', error);
            setStatus('error');
          });
      }, 700);

      return () => {
        if (saveTimerRef.current) {
          clearTimeout(saveTimerRef.current);
        }
      };
    }, [notes, loadedKey, userId, selectedCourseId, userCourseId]);

    const statusText = {
      idle: selectedCourseId ? '' : 'Select a course',
      loading: 'Loading...',
      saving: 'Saving...',
      saved: 'Saved',
      error: 'Save failed'
    }[status] || '';

    return (
      <div className="w-72 bg-discordDarker border-r border-black/20 flex flex-col h-full" data-name="sidebar" data-file="components/workspace/Sidebar.js">
        <div className="p-4 flex gap-2 border-b border-black/20">
          <button 
            onClick={() => setActiveTab('notes')}
            className={`flex-1 py-2 rounded-md font-mono text-xs flex items-center justify-center gap-2 ${activeTab === 'notes' ? 'bg-discordDark text-white' : 'text-gray-400 hover:bg-discordDarkest'}`}
          >
            <div className="icon-file-text"></div> NOTES
          </button>
        </div>

        <div className="px-4 pt-3 flex items-center justify-between gap-3">
          <p className="font-mono text-[10px] uppercase tracking-wider text-gray-500 truncate">
            {selectedCourseName}
          </p>
          {statusText && (
            <span className={`font-mono text-[10px] uppercase tracking-wider ${status === 'error' ? 'text-red-400' : status === 'saving' ? 'text-mcOrange' : 'text-gray-500'}`}>
              {statusText}
            </span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
          <textarea 
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            disabled={!selectedCourseId || status === 'loading'}
            className="w-full h-full bg-discordDarkest text-gray-200 p-4 rounded-lg resize-none border border-gray-700 focus:outline-none focus:border-mcPurple font-mono text-sm custom-scrollbar"
            placeholder={selectedCourseId ? "Jot down quick thoughts here..." : "Choose a course to start taking notes..."}
          />
        </div>
      </div>
    );
  } catch (error) {
    console.error('Sidebar error:', error);
    return null;
  }
}
