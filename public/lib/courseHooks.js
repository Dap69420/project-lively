// Hook to fetch courses from database
function useCourses() {
  const [courses, setCourses] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/courses');
      const result = await response.json();

      if (result.success) {
        setCourses(result.data);
      } else {
        setError('Failed to load courses');
      }
    } catch (err) {
      console.error('Error fetching courses:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return { courses, loading, error, refetch: fetchCourses };
}

// Hook to load user's course progress
function useUserCourses(userId) {
  const [userCourses, setUserCourses] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const loadUserCourses = async () => {
      try {
        const response = await fetch(`/api/user/courses?userId=${userId}`);
        const result = await response.json();

        if (result.success) {
          setUserCourses(result.data);
        }
      } catch (err) {
        console.error('Error loading user courses:', err);
      } finally {
        setLoading(false);
      }
    };

    loadUserCourses();
  }, [userId]);

  return { userCourses, loading };
}

// Hook to load user progression
function useUserProgression(userId) {
  const [progression, setProgression] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const loadProgression = async () => {
      try {
        const response = await fetch(`/api/progress?userId=${userId}`);
        const result = await response.json();

        if (result.success) {
          setProgression(result.data);
        }
      } catch (err) {
        console.error('Error loading progression:', err);
      } finally {
        setLoading(false);
      }
    };

    loadProgression();
  }, [userId]);

  return { progression, loading };
}

// Hook to enroll user in course
function useEnrollCourse(userId) {
  const [loading, setLoading] = React.useState(false);

  const enrollCourse = async (courseId) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/user/courses?userId=${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId })
      });

      const result = await response.json();
      return result;
    } catch (err) {
      console.error('Enrollment error:', err);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  return { enrollCourse, loading };
}

// Hook to save chat message
function useChatMessage() {
  const saveChatMessage = async (userId, courseId, role, text, metadata = {}) => {
    try {
      const response = await fetch(`/api/chat/messages?userId=${userId}&courseId=${courseId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, text, metadata })
      });

      const result = await response.json();
      return result;
    } catch (err) {
      console.error('Chat save error:', err);
      return { success: false, error: err.message };
    }
  };

  return { saveChatMessage };
}

// Hook to load chat history
function useChatHistory(userId, courseId) {
  const [messages, setMessages] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!userId || !courseId) {
      setLoading(false);
      return;
    }

    const loadMessages = async () => {
      try {
        const response = await fetch(`/api/chat/messages?userId=${userId}&courseId=${courseId}&limit=100`);
        const result = await response.json();

        if (result.success) {
          setMessages(result.data);
        }
      } catch (err) {
        console.error('Error loading chat history:', err);
      } finally {
        setLoading(false);
      }
    };

    loadMessages();
  }, [userId, courseId]);

  return { messages, loading };
}

// Hook to award XP/coins
function useAwardProgress(userId) {
  const awardXpCoins = async (xp, coins) => {
    try {
      const response = await fetch(`/api/progress?userId=${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ xp, coins })
      });

      const result = await response.json();
      return result;
    } catch (err) {
      console.error('Award error:', err);
      return { success: false, error: err.message };
    }
  };

  return { awardXpCoins };
}

// Hook to update course progress
function useUpdateCourseProgress(userId) {
  const updateProgress = async (userCourseId, progressData) => {
    try {
      const response = await fetch(`/api/user/courses?userId=${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userCourseId, ...progressData })
      });

      const result = await response.json();
      return result;
    } catch (err) {
      console.error('Update progress error:', err);
      return { success: false, error: err.message };
    }
  };

  return { updateProgress };
}
