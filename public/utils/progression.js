(function () {
  const STORAGE_KEY = 'lively.progress.v1';

  const COURSE_LIBRARY = [
    { id: 'physics', name: 'Physics', icon: 'icon-atom', focus: 'Motion, forces, energy', tone: 'text-neonViolet' },
    { id: 'math', name: 'Math', icon: 'icon-calculator', focus: 'Algebra, geometry, problem solving', tone: 'text-blue-400' },
    { id: 'biology', name: 'Biology', icon: 'icon-dna', focus: 'Cells, systems, ecosystems', tone: 'text-green-400' },
    { id: 'coding', name: 'Coding', icon: 'icon-code', focus: 'Logic, syntax, debugging', tone: 'text-cyan-400' },
    { id: 'history', name: 'History', icon: 'icon-landmark', focus: 'Events, timelines, cause and effect', tone: 'text-amber-400' }
  ];

  const ACHIEVEMENT_RULES = [
    { id: 'first-steps', name: 'First Steps', description: 'Earn 25 XP', test: (state) => state.xp >= 25 },
    { id: 'level-3', name: 'Level 3 Unlocked', description: 'Reach level 3', test: (state) => state.level >= 3 },
    { id: 'streak-3', name: 'Three Day Streak', description: 'Keep learning for 3 days', test: (state) => state.streak >= 3 },
    { id: 'coin-runner', name: 'Coin Runner', description: 'Collect 100 coins', test: (state) => state.coins >= 100 },
    { id: 'quiz-wins', name: 'Quiz Wins', description: 'Get 5 strong answers', test: (state) => state.correctAnswers >= 5 },
    { id: 'course-master', name: 'Course Master', description: 'Reach 150 XP in one course', test: (state) => Object.values(state.courseProgress || {}).some((course) => course.xp >= 150) }
  ];

  function createDefaultCourseProgress() {
    return COURSE_LIBRARY.reduce((acc, course) => {
      acc[course.id] = { xp: 0, questions: 0, mastery: 0 };
      return acc;
    }, {});
  }

  function createDefaultState() {
    return {
      alias: 'RECRUIT',
      selectedCourse: 'physics',
      level: 1,
      xp: 0,
      coins: 0,
      streak: 0,
      totalQuestions: 0,
      correctAnswers: 0,
      lastStudyDate: '',
      achievements: [],
      courseProgress: createDefaultCourseProgress(),
      chatHistory: {}
    };
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
    merged.selectedCourse = COURSE_LIBRARY.some((course) => course.id === merged.selectedCourse) ? merged.selectedCourse : base.selectedCourse;
    merged.achievements = Array.isArray(merged.achievements) ? merged.achievements : [];
    merged.courseProgress = Object.assign({}, createDefaultCourseProgress(), merged.courseProgress || {});
    COURSE_LIBRARY.forEach((course) => {
      merged.courseProgress[course.id] = Object.assign({ xp: 0, questions: 0, mastery: 0 }, merged.courseProgress[course.id] || {});
      const courseState = merged.courseProgress[course.id];
      courseState.mastery = Math.max(courseState.mastery || 0, Math.min(100, Math.floor(courseState.xp / 2)));
    });
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
    if (!COURSE_LIBRARY.some((course) => course.id === courseId)) {
      return currentState;
    }
    const next = normalizeState(currentState);
    next.selectedCourse = courseId;
    return saveState(next);
  }

  function setAlias(alias) {
    const next = normalizeState(currentState);
    next.alias = (alias || '').trim() || next.alias;
    return saveState(next);
  }

  function getSelectedCourse() {
    return COURSE_LIBRARY.find((course) => course.id === currentState.selectedCourse) || COURSE_LIBRARY[0];
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
      courses: COURSE_LIBRARY,
      achievements: ACHIEVEMENT_RULES,
      getSnapshot,
      subscribe,
      useProgress,
      awardProgress,
      setSelectedCourse,
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
