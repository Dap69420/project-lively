(function () {
  const LEVEL_BASE_XP = 100;
  const LEVEL_GROWTH_FACTOR = 1.4;

  const SUBJECT_DECORATIONS = {
    mathematics: { icon: 'icon-calculator', tone: 'text-blue-400' },
    math: { icon: 'icon-calculator', tone: 'text-blue-400' },
    science: { icon: 'icon-atom', tone: 'text-neonViolet' },
    physics: { icon: 'icon-atom', tone: 'text-neonViolet' },
    biology: { icon: 'icon-dna', tone: 'text-green-400' },
    chemistry: { icon: 'icon-flask-conical', tone: 'text-cyan-400' },
    english: { icon: 'icon-book-open', tone: 'text-amber-400' },
    history: { icon: 'icon-landmark', tone: 'text-orange-400' },
    coding: { icon: 'icon-code', tone: 'text-cyan-400' },
    technology: { icon: 'icon-laptop', tone: 'text-cyan-400' },
    default: { icon: 'icon-book-open', tone: 'text-neonViolet' }
  };

  const ACHIEVEMENT_RULES = [
    { id: 'first-steps', name: 'First Steps', description: 'Earn 25 XP', test: (state) => state.xp >= 25 },
    { id: 'level-3', name: 'Level 3 Unlocked', description: 'Reach level 3', test: (state) => state.level >= 3 },
    { id: 'streak-3', name: 'Three Day Streak', description: 'Keep learning for 3 days', test: (state) => state.streak >= 3 },
    { id: 'coin-runner', name: 'Coin Runner', description: 'Collect 100 coins', test: (state) => state.coins >= 100 },
    { id: 'quiz-wins', name: 'Quiz Wins', description: 'Get 5 strong answers', test: (state) => state.correctAnswers >= 5 },
    { id: 'course-master', name: 'Course Master', description: 'Reach 150 XP in one course', test: (state) => Object.values(state.courseProgress || {}).some((course) => course.xp >= 150) }
  ];

  function createDefaultCourseProgress() {
    return {};
  }

  function createDefaultState() {
    return {
      alias: 'RECRUIT',
      selectedCourse: '',
      level: 1,
      xp: 0,
      coins: 0,
      streak: 0,
      longestStreak: 0,
      totalQuestions: 0,
      correctAnswers: 0,
      lastStudyDate: '',
      achievements: [],
      availableCourses: [],
      catalogStatus: 'idle',
      catalogError: '',
      userId: '',
      userEmail: '',
      userGrade: '',
      courseProgress: createDefaultCourseProgress(),
      chatHistory: {}
    };
  }

  function subjectDecoration(subject) {
    const key = String(subject || '').trim().toLowerCase();
    return SUBJECT_DECORATIONS[key] || SUBJECT_DECORATIONS.default;
  }

  function normalizeCourse(course) {
    if (!course) {
      return null;
    }

    const decoration = subjectDecoration(course.subject);
    const focus = String(course.topic || course.ai_aim || course.description || course.subject || 'Learning path').trim();

    return {
      id: String(course.id),
      name: String(course.title || course.name || 'Untitled Course'),
      subject: String(course.subject || ''),
      grade: String(course.grade || ''),
      focus,
      description: String(course.description || ''),
      aiAim: String(course.ai_aim || ''),
      lessons: Array.isArray(course.lessons) ? course.lessons : [],
      objectives: Array.isArray(course.objectives) ? course.objectives : [],
      cardStyle: course.card_style && typeof course.card_style === 'object' ? course.card_style : (course.cardStyle && typeof course.cardStyle === 'object' ? course.cardStyle : {}),
      icon: decoration.icon,
      tone: decoration.tone,
      completionXp: Number(course.completion_xp || 0),
      completionCoins: Number(course.completion_coins || 0),
      difficulty: String(course.difficulty || 'intermediate')
    };
  }

  function normalizeCourseList(courses) {
    return (Array.isArray(courses) ? courses : [])
      .map(normalizeCourse)
      .filter(Boolean);
  }

  async function apiJson(url, options) {
    const response = await fetch(url, options);
    const text = await response.text();
    let payload = {};

    try {
      payload = text ? JSON.parse(text) : {};
    } catch (_error) {
      payload = { success: false, error: text || `Request failed with status ${response.status}` };
    }

    if (!response.ok) {
      const error = new Error(payload?.error || `Request failed with status ${response.status}`);
      error.status = response.status;
      error.payload = payload;
      throw error;
    }

    return payload;
  }

  function normalizeState(state) {
    const base = createDefaultState();
    const merged = Object.assign({}, base, state || {});
    merged.availableCourses = normalizeCourseList(merged.availableCourses);
    merged.catalogStatus = ['idle', 'loading', 'ready', 'error'].includes(merged.catalogStatus) ? merged.catalogStatus : 'idle';
    merged.catalogError = String(merged.catalogError || '');
    merged.userId = String(merged.userId || '');
    merged.userEmail = String(merged.userEmail || '');
    merged.userGrade = String(merged.userGrade || '');
    merged.achievements = Array.isArray(merged.achievements) ? merged.achievements : [];
    merged.courseProgress = Object.assign({}, createDefaultCourseProgress(), merged.courseProgress || {});
    merged.availableCourses.forEach((course) => {
      merged.courseProgress[course.id] = Object.assign({ xp: 0, questions: 0, mastery: 0, completed: false, completedAt: '' }, merged.courseProgress[course.id] || {});
      const courseState = merged.courseProgress[course.id];
      courseState.mastery = Math.max(0, Math.min(100, Math.floor(Number(courseState.xp || 0) / 2)));
      courseState.completed = Boolean(courseState.completed);
    });
    if (merged.availableCourses.length > 0) {
      const hasSelectedCourse = merged.availableCourses.some((course) => course.id === merged.selectedCourse);
      merged.selectedCourse = hasSelectedCourse ? merged.selectedCourse : merged.availableCourses[0].id;
    } else {
      merged.selectedCourse = '';
    }
    merged.level = Math.max(1, Number(merged.level || 1));
    merged.xp = Math.max(0, Number(merged.xp || 0));
    return merged;
  }

  function getRequiredXpForLevel(level) {
    const normalizedLevel = Math.max(1, Number(level || 1));
    return Math.floor(LEVEL_BASE_XP * Math.pow(LEVEL_GROWTH_FACTOR, normalizedLevel - 1));
  }

  function applyXpGainWithLevelReset(state, gain) {
    const next = state;
    let xpDelta = Math.round(Number(gain || 0));

    while (xpDelta > 0) {
      const requiredXp = getRequiredXpForLevel(next.level);
      const remainingToLevel = Math.max(1, requiredXp - next.xp);

      if (xpDelta >= remainingToLevel) {
        xpDelta -= remainingToLevel;
        next.level += 1;
        next.xp = 0;
      } else {
        next.xp += xpDelta;
        xpDelta = 0;
      }
    }

    while (xpDelta < 0) {
      const loss = Math.abs(xpDelta);

      if (loss <= next.xp) {
        next.xp -= loss;
        xpDelta = 0;
        break;
      }

      xpDelta = loss - next.xp;

      if (next.level === 1) {
        next.xp = 0;
        xpDelta = 0;
        break;
      }

      next.level -= 1;
      next.xp = getRequiredXpForLevel(next.level);
      xpDelta = -xpDelta;
    }

    return next;
  }

  function loadState() {
    return normalizeState(createDefaultState());
  }

  let currentState = loadState();
  const listeners = new Set();

  function saveState(nextState) {
    currentState = normalizeState(nextState);
    listeners.forEach((listener) => listener());
    return currentState;
  }

  function getSnapshot() {
    return currentState;
  }

  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  function diffDays(a, b) {
    const ms = 1000 * 60 * 60 * 24;
    const start = new Date(a).setHours(0, 0, 0, 0);
    const end = new Date(b).setHours(0, 0, 0, 0);
    return Math.round((end - start) / ms);
  }

  function unlockAchievements(state) {
    const unlocked = new Set(state.achievements || []);
    ACHIEVEMENT_RULES.forEach((achievement) => {
      if (achievement.test(state)) {
        unlocked.add(achievement.id);
      }
    });
    state.achievements = Array.from(unlocked);
    return state;
  }

  function updateMastery(state, courseId, xpAmount) {
    if (!courseId) {
      return state;
    }
    const course = state.courseProgress[courseId] || { xp: 0, questions: 0, mastery: 0, completed: false, completedAt: '' };
    course.xp += xpAmount;
    course.questions += 1;
    course.mastery = Math.max(0, Math.min(100, Math.floor(course.xp / 2)));
    state.courseProgress[courseId] = course;
    return state;
  }

  function getCourseById(courseId) {
    return currentState.availableCourses.find((course) => course.id === courseId) || null;
  }

  async function syncProgressToServer(nextState) {
    if (!currentState.userId) {
      return null;
    }

    const completedCourses = Object.values(nextState.courseProgress || {}).filter((course) => course.completed).length;

    return apiJson(`/api/progress?userId=${encodeURIComponent(currentState.userId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        total_xp: nextState.xp,
        total_coins: nextState.coins,
        global_level: nextState.level,
        current_streak: nextState.streak,
        longest_streak: Math.max(nextState.longestStreak || nextState.streak || 0, nextState.streak || 0),
        total_courses_completed: completedCourses
      })
    });
  }

  async function syncChatMessageToServer(message) {
    if (!currentState.userId || !message || !message.courseId) {
      return null;
    }

    return apiJson(`/api/chat/messages?userId=${encodeURIComponent(currentState.userId)}&courseId=${encodeURIComponent(message.courseId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: message.role,
        text: message.text,
        metadata: message.metadata || {},
        userCourseId: message.userCourseId || null
      })
    });
  }

  async function syncCourseToServer(courseId, updates) {
    if (!currentState.userId || !courseId) {
      return null;
    }

    return apiJson(`/api/user/courses?userId=${encodeURIComponent(currentState.userId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.assign({ courseId }, updates || {}))
    });
  }

  async function completeCourse(courseId) {
    const course = getCourseById(courseId);
    const currentCourseState = currentState.courseProgress[courseId] || { xp: 0, questions: 0, mastery: 0, completed: false, completedAt: '' };

    if (!course || currentCourseState.completed) {
      return currentState;
    }

    const next = normalizeState(currentState);
    next.courseProgress[courseId] = Object.assign({}, currentCourseState, {
      completed: true,
      completedAt: new Date().toISOString(),
      mastery: 100
    });

    applyXpGainWithLevelReset(next, course.completionXp || 0);
    if (course.completionCoins) {
      next.coins += course.completionCoins;
    }

    saveState(next);

    if (currentState.userId) {
      try {
        await syncCourseToServer(courseId, {
          progress_percentage: 100,
          completed: true,
          xp_in_course: next.courseProgress[courseId].xp,
          coins_earned: next.courseProgress[courseId].coins || 0,
          stats: next.courseProgress[courseId].stats || {
            lessonsCompleted: 0,
            questionsAnswered: next.courseProgress[courseId].questions || 0,
            correctAnswers: 0,
            sketchesAnalyzed: 0,
            totalTimeSpent: 0
          }
        });

        if (course.completionXp || course.completionCoins) {
          await apiJson(`/api/progress?userId=${encodeURIComponent(currentState.userId)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ xp: course.completionXp || 0, coins: course.completionCoins || 0 })
          });
        }

        await syncProgressToServer(next);
      } catch (error) {
        console.error('Course completion sync error:', error);
      }
    }

    return next;
  }

  function awardProgress(payload) {
    const award = Object.assign({ xp: 0, coins: 0, correct: false, courseId: currentState.selectedCourse, source: 'ai' }, payload || {});
    const today = new Date().toISOString().slice(0, 10);
    const next = normalizeState(currentState);

    if (award.correct) {
      next.correctAnswers += 1;
    }
    next.totalQuestions += 1;
    applyXpGainWithLevelReset(next, award.xp);
    next.coins += Math.max(0, Math.round(award.coins));
    updateMastery(next, award.courseId, Math.round(Number(award.xp || 0)));

    if (!next.lastStudyDate) {
      next.streak = 1;
    } else if (next.lastStudyDate === today) {
      // keep streak the same on the same day
    } else {
      next.streak = diffDays(next.lastStudyDate, today) === 1 ? next.streak + 1 : 1;
    }
    next.longestStreak = Math.max(next.longestStreak || 0, next.streak || 0);
    next.lastStudyDate = today;
    unlockAchievements(next);
    saveState(next);

    if (currentState.userId) {
      syncProgressToServer(next).catch((error) => {
        console.error('Progress sync error:', error);
      });
    }

    return next;
  }

  function setSelectedCourse(courseId) {
    if (!currentState.availableCourses.some((course) => course.id === courseId)) {
      return currentState;
    }
    const next = normalizeState(currentState);
    next.selectedCourse = courseId;
    saveState(next);
    return next;
  }

  async function loadCoursesForGrade(grade) {
    const normalizedGrade = String(grade || '').trim();
    const next = normalizeState(currentState);
    next.catalogStatus = 'loading';
    next.catalogError = '';
    saveState(next);

    try {
      const query = normalizedGrade ? `?grade=${encodeURIComponent(normalizedGrade)}` : '';
      const response = await fetch(`/api/courses${query}`);
      const text = await response.text();
      let payload;

      try {
        payload = text ? JSON.parse(text) : {};
      } catch (_error) {
        throw new Error(text || `Request failed with status ${response.status}`);
      }

      if (!response.ok) {
        throw new Error(payload?.error || `Request failed with status ${response.status}`);
      }

      const availableCourses = normalizeCourseList(payload?.data || []);
      const nextState = normalizeState(Object.assign({}, currentState, {
        availableCourses,
        catalogStatus: 'ready',
        catalogError: ''
      }));
      return saveState(nextState);
    } catch (error) {
      const nextState = normalizeState(Object.assign({}, currentState, {
        availableCourses: [],
        catalogStatus: 'error',
        catalogError: error?.message || 'Failed to load courses'
      }));
      saveState(nextState);
      throw error;
    }
  }

  function setAvailableCourses(courses) {
    const next = normalizeState(Object.assign({}, currentState, {
      availableCourses: normalizeCourseList(courses),
      catalogStatus: 'ready',
      catalogError: ''
    }));
    saveState(next);
    return next;
  }

  function setAlias(alias) {
    const next = normalizeState(currentState);
    next.alias = (alias || '').trim() || next.alias;
    saveState(next);

    if (currentState.userId) {
      syncProgressToServer(next).catch((error) => {
        console.error('Alias sync error:', error);
      });
    }

    return next;
  }

  function setUserContext(user) {
    const next = normalizeState(Object.assign({}, currentState, {
      userId: user?.id || '',
      userEmail: user?.email || '',
      userGrade: user?.user_metadata?.grade || '',
      alias: user?.user_metadata?.alias || currentState.alias
    }));

    saveState(next);
    return hydrateFromServer(user);
  }

  async function hydrateFromServer(user) {
    const userId = user?.id;
    if (!userId) {
      return currentState;
    }

    try {
      const next = normalizeState(Object.assign({}, currentState, {
        userId,
        userEmail: user.email || '',
        userGrade: user?.user_metadata?.grade || '',
        alias: user?.user_metadata?.alias || currentState.alias,
        catalogStatus: 'loading'
      }));
      saveState(next);

      const [progressResult, coursesResult, userCoursesResult] = await Promise.all([
        apiJson(`/api/progress?userId=${encodeURIComponent(userId)}`),
        user?.user_metadata?.grade ? apiJson(`/api/courses?grade=${encodeURIComponent(user.user_metadata.grade)}`) : Promise.resolve({ success: true, data: [] }),
        apiJson(`/api/user/courses?userId=${encodeURIComponent(userId)}`)
      ]);

      const availableCourses = normalizeCourseList(coursesResult?.data || []);
      const userProgressRows = Array.isArray(userCoursesResult?.data) ? userCoursesResult.data : [];
      const courseProgress = {};

      userProgressRows.forEach((row) => {
        courseProgress[row.course_id] = {
          xp: Number(row.xp_in_course || 0),
          questions: Number(row.stats?.questionsAnswered || 0),
          mastery: Math.min(100, Math.floor(Number(row.xp_in_course || 0) / 2)),
          completed: Boolean(row.completed),
          completedAt: row.completed_at || '',
          progress_percentage: Number(row.progress_percentage || 0),
          coins: Number(row.coins_earned || 0),
          userCourseId: row.id
        };
      });

      const nextState = normalizeState(Object.assign({}, currentState, {
        userId,
        userEmail: user.email || '',
        userGrade: user?.user_metadata?.grade || '',
        alias: user?.user_metadata?.alias || currentState.alias,
        availableCourses,
        catalogStatus: 'ready',
        catalogError: '',
        xp: Number(progressResult?.data?.total_xp || currentState.xp || 0),
        coins: Number(progressResult?.data?.total_coins || currentState.coins || 0),
        level: Number(progressResult?.data?.global_level || currentState.level || 1),
        streak: Number(progressResult?.data?.current_streak || currentState.streak || 0),
        longestStreak: Number(progressResult?.data?.longest_streak || currentState.longestStreak || 0),
        courseProgress: Object.assign({}, currentState.courseProgress || {}, courseProgress),
        selectedCourse: currentState.selectedCourse || (availableCourses[0] && availableCourses[0].id) || ''
      }));

      saveState(nextState);
      return nextState;
    } catch (error) {
      console.error('hydrateFromServer error:', error);
      const fallbackState = normalizeState(Object.assign({}, currentState, {
        userId,
        userEmail: user.email || '',
        userGrade: user?.user_metadata?.grade || '',
        alias: user?.user_metadata?.alias || currentState.alias,
        catalogStatus: 'error',
        catalogError: error?.message || 'Failed to load server state'
      }));
      saveState(fallbackState);
      return fallbackState;
    }
  }

  function getSelectedCourse() {
    const selected = currentState.availableCourses.find((course) => course.id === currentState.selectedCourse);
    if (selected) {
      return selected;
    }
    return currentState.availableCourses[0] || {
      id: '',
      name: 'No courses available',
      focus: 'Ask an admin to add courses for this grade',
      icon: 'icon-alert-triangle',
      tone: 'text-gray-500'
    };
  }

  function addChatMessage(message) {
    const next = normalizeState(currentState);
    const courseId = message.courseId || currentState.selectedCourse;
    if (!next.chatHistory) next.chatHistory = {};
    if (!next.chatHistory[courseId]) next.chatHistory[courseId] = [];
    const normalizedRole = message.role === 'ai' ? 'assistant' : String(message.role || 'user');
    next.chatHistory[courseId].push({
      role: message.role,
      text: message.text,
      time: message.time,
      timestamp: Date.now()
    });
    saveState(next);

    if (currentState.userId) {
      syncChatMessageToServer({
        role: normalizedRole,
        text: message.text,
        courseId,
        metadata: message.metadata || {},
        userCourseId: message.userCourseId || null
      }).catch((error) => {
        console.error('Chat sync error:', error);
      });
    }

    return next;
  }

  function getChatMessages(courseId) {
    const course = courseId || currentState.selectedCourse;
    return (currentState.chatHistory && currentState.chatHistory[course]) || [];
  }

  function clearChatHistory(courseId) {
    const next = normalizeState(currentState);
    if (!next.chatHistory) next.chatHistory = {};
    const course = courseId || currentState.selectedCourse;
    next.chatHistory[course] = [];
    saveState(next);
    return next;
  }

  function getNextLevelXp(state) {
    const snapshot = normalizeState(state || currentState);
    const nextLevel = getRequiredXpForLevel(snapshot.level);
    return {
      currentLevel: snapshot.level,
      currentXp: snapshot.xp,
      nextLevelXp: nextLevel,
      progressInLevel: snapshot.xp,
      remaining: Math.max(0, nextLevel - snapshot.xp)
    };
  }

  function useProgress() {
    const [state, setState] = React.useState(getSnapshot());
    React.useEffect(() => subscribe(() => setState(getSnapshot())), []);
    return state;
  }

  if (typeof window !== 'undefined') {
    window.LivelyProgress = {
      get courses() {
        return getSnapshot().availableCourses;
      },
      achievements: ACHIEVEMENT_RULES,
      getSnapshot,
      subscribe,
      useProgress,
      awardProgress,
      completeCourse,
      setSelectedCourse,
      setAvailableCourses,
      loadCoursesForGrade,
      setUserContext,
      setAlias,
      getSelectedCourse,
      getNextLevelXp,
      addChatMessage,
      getChatMessages,
      clearChatHistory
    };

  }
})();
