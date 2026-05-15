(function () {
  const STORAGE_KEY = 'lively.progress.v1';

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
      totalQuestions: 0,
      correctAnswers: 0,
      lastStudyDate: '',
      achievements: [],
      availableCourses: [],
      catalogStatus: 'idle',
      catalogError: '',
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

  function safeParse(jsonText) {
    try {
      return JSON.parse(jsonText);
    } catch (_error) {
      return null;
    }
  }

  function normalizeState(state) {
    const base = createDefaultState();
    const merged = Object.assign({}, base, state || {});
    merged.availableCourses = normalizeCourseList(merged.availableCourses);
    merged.catalogStatus = ['idle', 'loading', 'ready', 'error'].includes(merged.catalogStatus) ? merged.catalogStatus : 'idle';
    merged.catalogError = String(merged.catalogError || '');
    merged.achievements = Array.isArray(merged.achievements) ? merged.achievements : [];
    merged.courseProgress = Object.assign({}, createDefaultCourseProgress(), merged.courseProgress || {});
    merged.availableCourses.forEach((course) => {
      merged.courseProgress[course.id] = Object.assign({ xp: 0, questions: 0, mastery: 0 }, merged.courseProgress[course.id] || {});
      const courseState = merged.courseProgress[course.id];
      courseState.mastery = Math.max(courseState.mastery || 0, Math.min(100, Math.floor(courseState.xp / 2)));
    });
    if (merged.availableCourses.length > 0) {
      const hasSelectedCourse = merged.availableCourses.some((course) => course.id === merged.selectedCourse);
      merged.selectedCourse = hasSelectedCourse ? merged.selectedCourse : merged.availableCourses[0].id;
    } else {
      merged.selectedCourse = '';
    }
    merged.level = Math.max(1, Math.floor((merged.xp || 0) / 100) + 1);
    return merged;
  }

  function loadState() {
    if (typeof window === 'undefined' || !window.localStorage) {
      return normalizeState(createDefaultState());
    }
    const stored = safeParse(window.localStorage.getItem(STORAGE_KEY));
    return normalizeState(stored || createDefaultState());
  }

  let currentState = loadState();
  const listeners = new Set();

  function saveState(nextState) {
    currentState = normalizeState(nextState);
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(currentState));
    }
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
    const course = state.courseProgress[courseId] || { xp: 0, questions: 0, mastery: 0 };
    course.xp += xpAmount;
    course.questions += 1;
    course.mastery = Math.min(100, Math.floor(course.xp / 2));
    state.courseProgress[courseId] = course;
    return state;
  }

  function awardProgress(payload) {
    const award = Object.assign({ xp: 0, coins: 0, correct: false, courseId: currentState.selectedCourse, source: 'ai' }, payload || {});
    const today = new Date().toISOString().slice(0, 10);
    const next = normalizeState(currentState);

    if (award.correct) {
      next.correctAnswers += 1;
    }
    next.totalQuestions += 1;
    next.xp += Math.max(0, Math.round(award.xp));
    next.coins += Math.max(0, Math.round(award.coins));
    updateMastery(next, award.courseId, Math.max(0, Math.round(award.xp)));

    if (!next.lastStudyDate) {
      next.streak = 1;
    } else if (next.lastStudyDate === today) {
      // keep streak the same on the same day
    } else {
      next.streak = diffDays(next.lastStudyDate, today) === 1 ? next.streak + 1 : 1;
    }
    next.lastStudyDate = today;
    next.level = Math.max(1, Math.floor(next.xp / 100) + 1);
    unlockAchievements(next);
    return saveState(next);
  }

  function setSelectedCourse(courseId) {
    if (!currentState.availableCourses.some((course) => course.id === courseId)) {
      return currentState;
    }
    const next = normalizeState(currentState);
    next.selectedCourse = courseId;
    return saveState(next);
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
    return saveState(next);
  }

  function setAlias(alias) {
    const next = normalizeState(currentState);
    next.alias = (alias || '').trim() || next.alias;
    return saveState(next);
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
    next.chatHistory[courseId].push({
      role: message.role,
      text: message.text,
      time: message.time,
      timestamp: Date.now()
    });
    return saveState(next);
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
    return saveState(next);
  }

  function getNextLevelXp(state) {
    const snapshot = normalizeState(state || currentState);
    const nextLevel = snapshot.level * 100;
    return {
      currentLevel: snapshot.level,
      currentXp: snapshot.xp,
      nextLevelXp: nextLevel,
      progressInLevel: snapshot.xp - ((snapshot.level - 1) * 100),
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
      setSelectedCourse,
      setAvailableCourses,
      loadCoursesForGrade,
      setAlias,
      getSelectedCourse,
      getNextLevelXp,
      addChatMessage,
      getChatMessages,
      clearChatHistory
    };

    window.addEventListener('storage', () => {
      currentState = loadState();
      listeners.forEach((listener) => listener());
    });
  }
})();
