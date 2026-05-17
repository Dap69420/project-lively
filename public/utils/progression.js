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
      achievementCatalog: ACHIEVEMENT_RULES,
      availableCourses: [],
      catalogStatus: 'idle',
      catalogError: '',
      userId: '',
      userEmail: '',
      userGrade: '',
      username: '',
      displayName: '',
      avatarUrl: '',
      courseProgress: createDefaultCourseProgress(),
      chatHistory: {}
    };
  }

  const SESSION_STORAGE_KEY = 'lively_progress_state_v1';

  function readSessionSnapshot() {
    if (typeof window === 'undefined' || !window.sessionStorage) {
      return null;
    }

    try {
      const raw = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (!raw) {
        return null;
      }

      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') {
        return null;
      }

      return parsed;
    } catch (_error) {
      return null;
    }
  }

  function writeSessionSnapshot(state) {
    if (typeof window === 'undefined' || !window.sessionStorage) {
      return;
    }

    try {
      const snapshot = {
        alias: state.alias,
        selectedCourse: state.selectedCourse,
        level: state.level,
        xp: state.xp,
        coins: state.coins,
        streak: state.streak,
        longestStreak: state.longestStreak,
        totalQuestions: state.totalQuestions,
        correctAnswers: state.correctAnswers,
        lastStudyDate: state.lastStudyDate,
        achievements: state.achievements,
        achievementCatalog: state.achievementCatalog,
        availableCourses: state.availableCourses,
        catalogStatus: state.catalogStatus,
        catalogError: state.catalogError,
        userId: state.userId,
        userEmail: state.userEmail,
        userGrade: state.userGrade,
        username: state.username,
        displayName: state.displayName,
        avatarUrl: state.avatarUrl,
        courseProgress: state.courseProgress,
        chatHistory: state.chatHistory
      };

      window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(snapshot));
    } catch (_error) {
      // Ignore storage failures and keep operating in-memory.
    }
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
      aiSettings: course.ai_settings && typeof course.ai_settings === 'object' ? course.ai_settings : (course.aiSettings && typeof course.aiSettings === 'object' ? course.aiSettings : {}),
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
    merged.username = String(merged.username || '');
    merged.displayName = String(merged.displayName || '');
    merged.avatarUrl = String(merged.avatarUrl || '');
    merged.achievements = Array.isArray(merged.achievements) ? merged.achievements : [];
    merged.achievementCatalog = Array.isArray(merged.achievementCatalog) && merged.achievementCatalog.length ? merged.achievementCatalog : ACHIEVEMENT_RULES;
    merged.courseProgress = Object.assign({}, createDefaultCourseProgress(), merged.courseProgress || {});
    merged.availableCourses.forEach((course) => {
      merged.courseProgress[course.id] = Object.assign({ xp: 0, questions: 0, mastery: 0, completed: false, completedAt: '', objectiveStatus: [], stats: {} }, merged.courseProgress[course.id] || {});
      const courseState = merged.courseProgress[course.id];
      const objectives = Array.isArray(course.objectives) ? course.objectives : [];
      const storedObjectiveStatus = Array.isArray(courseState.objectiveStatus) && courseState.objectiveStatus.length
        ? courseState.objectiveStatus
        : Array.isArray(courseState.stats?.objectiveStatus)
          ? courseState.stats.objectiveStatus
          : [];
      const finalTest = courseState.stats?.finalTest && typeof courseState.stats.finalTest === 'object' ? courseState.stats.finalTest : null;
      courseState.completed = Boolean(courseState.completed);
      courseState.objectiveStatus = objectives.map((_objective, index) => Boolean(storedObjectiveStatus[index]));
      const objectiveMastery = objectives.length ? Math.round((courseState.objectiveStatus.filter(Boolean).length / objectives.length) * 100) : 0;
      courseState.mastery = Math.max(0, Math.min(100, Math.max(Math.floor(Number(courseState.xp || 0) / 2), Number(courseState.progress_percentage || 0), objectiveMastery)));
      courseState.stats = Object.assign({}, courseState.stats || {}, {
        objectiveStatus: courseState.objectiveStatus,
        finalTest,
        questionsAnswered: Number(courseState.stats?.questionsAnswered || courseState.questions || 0)
      });
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
    const previousLevel = Number(next.level || 1);
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
    return normalizeState(Object.assign({}, createDefaultState(), readSessionSnapshot() || {}));
  }

  let currentState = loadState();
  const listeners = new Set();

  function saveState(nextState) {
    currentState = normalizeState(nextState);
    writeSessionSnapshot(currentState);
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
    const rules = Array.isArray(state.achievementCatalog) && state.achievementCatalog.length ? state.achievementCatalog : ACHIEVEMENT_RULES;
    rules.forEach((achievement) => {
      const passed = typeof achievement.test === 'function'
        ? achievement.test(state)
        : achievementRuleIsMet(achievement, state);
      if (passed) {
        unlocked.add(achievement.id);
      }
    });
    state.achievements = Array.from(unlocked);
    return state;
  }

  function achievementRuleIsMet(achievement, state) {
    const value = Number(achievement.condition_value ?? achievement.conditionValue ?? 1);
    const type = String(achievement.condition_type || achievement.conditionType || 'total_xp');
    const completedCourses = Object.values(state.courseProgress || {}).filter((course) => course.completed).length;

    if (type === 'total_xp') return Number(state.xp || 0) >= value;
    if (type === 'level') return Number(state.level || 1) >= value;
    if (type === 'streak') return Number(state.streak || 0) >= value;
    if (type === 'coins') return Number(state.coins || 0) >= value;
    if (type === 'correct_answers') return Number(state.correctAnswers || 0) >= value;
    if (type === 'courses_completed') return completedCourses >= value;
    return false;
  }

  async function syncAchievements(nextState) {
    if (!currentState.userId) {
      return null;
    }

    const completedCourses = Object.values(nextState.courseProgress || {}).filter((course) => course.completed).length;
    return apiJson(`/api/achievements?userId=${encodeURIComponent(currentState.userId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        totalXp: nextState.xp,
        coins: nextState.coins,
        level: nextState.level,
        streak: nextState.streak,
        correctAnswers: nextState.correctAnswers,
        coursesCompleted: completedCourses
      })
    });
  }

  function updateMastery(state, courseId, xpAmount) {
    if (!courseId) {
      return state;
    }
    const course = state.courseProgress[courseId] || { xp: 0, questions: 0, mastery: 0, completed: false, completedAt: '', objectiveStatus: [], stats: {} };
    course.xp += xpAmount;
    course.questions += 1;
    course.mastery = Math.max(0, Math.min(100, Math.floor(course.xp / 2)));
    course.stats = Object.assign({}, course.stats || {}, {
      questionsAnswered: course.questions,
      objectiveStatus: Array.isArray(course.objectiveStatus) ? course.objectiveStatus : []
    });
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
    const completedObjectiveStatus = Array.isArray(course.objectives) ? course.objectives.map(() => true) : [];
    next.courseProgress[courseId] = Object.assign({}, currentCourseState, {
      completed: true,
      completedAt: new Date().toISOString(),
      mastery: 100,
      objectiveStatus: completedObjectiveStatus,
      stats: Object.assign({}, currentCourseState.stats || {}, {
        objectiveStatus: completedObjectiveStatus,
        questionsAnswered: currentCourseState.questions || 0
      })
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
            totalTimeSpent: 0,
            objectiveStatus: completedObjectiveStatus
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
        const achievementResult = await syncAchievements(next).catch(() => null);
        if (achievementResult?.owned) {
          const refreshed = normalizeState(Object.assign({}, currentState, { achievements: achievementResult.owned }));
          saveState(refreshed);
        }
      } catch (error) {
        console.error('Course completion sync error:', error);
      }
    }

    return next;
  }

  async function recordFinalTestResult(courseId, result) {
    const course = getCourseById(courseId);
    if (!course) {
      return currentState;
    }

    const next = normalizeState(currentState);
    const courseState = next.courseProgress[courseId] || { xp: 0, questions: 0, mastery: 0, completed: false, objectiveStatus: [], stats: {} };
    const previousFinalTest = courseState.stats?.finalTest || {};
    const attempts = Number(previousFinalTest.attempts || 0) + 1;
    const finalTest = Object.assign({}, previousFinalTest, {
      attempts,
      lastScore: Number(result?.score || 0),
      totalQuestions: Number(result?.totalQuestions || 10),
      passScore: Number(result?.passScore || 4),
      passed: Boolean(result?.passed),
      lastTakenAt: new Date().toISOString(),
      status: result?.passed ? 'passed' : 'failed',
      draft: null
    });

    next.courseProgress[courseId] = Object.assign({}, courseState, {
      stats: Object.assign({}, courseState.stats || {}, { finalTest })
    });

    saveState(next);

    if (currentState.userId) {
      syncCourseToServer(courseId, {
        progress_percentage: next.courseProgress[courseId].progress_percentage || 100,
        xp_in_course: next.courseProgress[courseId].xp || 0,
        coins_earned: next.courseProgress[courseId].coins || 0,
        stats: next.courseProgress[courseId].stats
      }).catch((error) => {
        console.error('Final test sync error:', error);
      });
    }

    return next;
  }

  function saveFinalTestDraft(courseId, draft) {
    const course = getCourseById(courseId);
    if (!course || !draft) {
      return currentState;
    }

    const next = normalizeState(currentState);
    const courseState = next.courseProgress[courseId] || { xp: 0, questions: 0, mastery: 0, completed: false, objectiveStatus: [], stats: {} };
    const previousFinalTest = courseState.stats?.finalTest || {};
    const safeDraft = {
      title: String(draft.title || `${course.name || 'Course'} Final Test`),
      passScore: Number(draft.passScore || draft.pass_score || 4),
      questions: Array.isArray(draft.questions) ? draft.questions.slice(0, 10) : [],
      answers: Array.isArray(draft.answers) ? draft.answers.slice(0, 10) : [],
      attempt: Number(draft.attempt || previousFinalTest.attempts || 1),
      savedAt: new Date().toISOString()
    };

    next.courseProgress[courseId] = Object.assign({}, courseState, {
      stats: Object.assign({}, courseState.stats || {}, {
        finalTest: Object.assign({}, previousFinalTest, {
          status: 'in_progress',
          passed: false,
          passScore: safeDraft.passScore,
          draft: safeDraft
        })
      })
    });

    saveState(next);

    if (currentState.userId) {
      syncCourseToServer(courseId, {
        progress_percentage: next.courseProgress[courseId].progress_percentage || 99,
        xp_in_course: next.courseProgress[courseId].xp || 0,
        coins_earned: next.courseProgress[courseId].coins || 0,
        stats: next.courseProgress[courseId].stats
      }).catch((error) => {
        console.error('Final test draft sync error:', error);
      });
    }

    return next;
  }

  function clearFinalTestDraft(courseId) {
    const course = getCourseById(courseId);
    if (!course) {
      return currentState;
    }

    const next = normalizeState(currentState);
    const courseState = next.courseProgress[courseId] || { stats: {} };
    const previousFinalTest = courseState.stats?.finalTest || {};
    next.courseProgress[courseId] = Object.assign({}, courseState, {
      stats: Object.assign({}, courseState.stats || {}, {
        finalTest: Object.assign({}, previousFinalTest, { draft: null })
      })
    });
    saveState(next);
    return next;
  }

  async function markObjectiveProgress(courseId, decision) {
    const course = getCourseById(courseId);
    if (!course || currentState.courseProgress[courseId]?.completed) {
      return { state: currentState, indexes: [], newlyCompleted: [], allComplete: Boolean(currentState.courseProgress[courseId]?.completed) };
    }

    const objectives = Array.isArray(course.objectives) ? course.objectives : [];
    if (objectives.length === 0) {
      return { state: currentState, indexes: [], newlyCompleted: [], allComplete: Boolean(decision?.completed) };
    }

    const currentCourseState = currentState.courseProgress[courseId] || {};
    const existingStatus = Array.isArray(currentCourseState.objectiveStatus) ? currentCourseState.objectiveStatus : [];
    const nextStatus = objectives.map((_objective, index) => Boolean(existingStatus[index]));
    const completionRequested = Boolean(decision?.objective_completed || decision?.completed);

    if (!completionRequested) {
      return {
        state: currentState,
        indexes: [],
        newlyCompleted: [],
        allComplete: nextStatus.every(Boolean)
      };
    }

    const indexes = [];
    const rawIndexes = Array.isArray(decision?.completed_objective_indexes)
      ? decision.completed_objective_indexes
      : Array.isArray(decision?.completedObjectiveIndexes)
        ? decision.completedObjectiveIndexes
        : [];

    rawIndexes.forEach((index) => indexes.push(Number(index)));

    if (Number.isFinite(Number(decision?.objective_index))) {
      indexes.push(Number(decision.objective_index));
    }

    if (indexes.length === 0) {
      const firstIncomplete = nextStatus.findIndex((complete) => !complete);
      if (firstIncomplete >= 0) indexes.push(firstIncomplete);
    }

    const uniqueIndexes = Array.from(new Set(indexes))
      .map((index) => Math.floor(index))
      .filter((index) => index >= 0 && index < objectives.length);
    const newlyCompleted = uniqueIndexes.filter((index) => !nextStatus[index]);

    newlyCompleted.forEach((index) => {
      nextStatus[index] = true;
    });

    if (newlyCompleted.length === 0) {
      return {
        state: currentState,
        indexes: uniqueIndexes,
        newlyCompleted,
        allComplete: nextStatus.every(Boolean)
      };
    }

    const next = normalizeState(currentState);
    const percent = Math.round((nextStatus.filter(Boolean).length / objectives.length) * 100);
    next.courseProgress[courseId] = Object.assign({}, next.courseProgress[courseId] || {}, {
      objectiveStatus: nextStatus,
      mastery: Math.max(Number(next.courseProgress[courseId]?.mastery || 0), percent),
      progress_percentage: percent,
      stats: Object.assign({}, next.courseProgress[courseId]?.stats || {}, {
        objectiveStatus: nextStatus,
        questionsAnswered: next.courseProgress[courseId]?.questions || 0
      })
    });

    saveState(next);

    if (currentState.userId) {
      syncCourseToServer(courseId, {
        progress_percentage: percent,
        xp_in_course: next.courseProgress[courseId].xp || 0,
        coins_earned: next.courseProgress[courseId].coins || 0,
        stats: next.courseProgress[courseId].stats
      }).catch((error) => {
        console.error('Objective progress sync error:', error);
      });
    }

    return {
      state: next,
      indexes: uniqueIndexes,
      newlyCompleted,
      allComplete: nextStatus.every(Boolean)
    };
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
      syncAchievements(next)
        .then((result) => {
          if (result?.owned) {
            saveState(Object.assign({}, currentState, { achievements: result.owned }));
          }
        })
        .catch((error) => {
          console.error('Achievement sync error:', error);
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

  async function loadAllCourses() {
    try {
      const response = await fetch('/api/courses');
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

      const allCourses = normalizeCourseList(payload?.data || []);
      return allCourses;
    } catch (error) {
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

  async function updateUserProfile(profile) {
    if (!currentState.userId) {
      return currentState;
    }

    const response = await apiJson(`/api/profile?userId=${encodeURIComponent(currentState.userId)}&email=${encodeURIComponent(currentState.userEmail || '')}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile || {})
    });
    const data = response?.data || {};
    const next = normalizeState(Object.assign({}, currentState, {
      username: data.username || currentState.username,
      displayName: data.display_name || data.displayName || currentState.displayName,
      avatarUrl: data.avatar_url || data.avatarUrl || currentState.avatarUrl,
      alias: data.username || currentState.alias
    }));

    saveState(next);
    return next;
  }

  function spendCoins(amount, reason = '') {
    const cost = Math.max(0, Math.round(Number(amount || 0)));
    if (cost <= 0) {
      return { success: true, state: currentState };
    }

    if (Number(currentState.coins || 0) < cost) {
      return {
        success: false,
        error: `You need ${cost} coins for this.`,
        state: currentState
      };
    }

    const next = normalizeState(currentState);
    next.coins = Math.max(0, Number(next.coins || 0) - cost);
    saveState(next);

    if (currentState.userId) {
      syncProgressToServer(next).catch((error) => {
        console.error('Coin spend sync error:', error, reason);
      });
    }

    return { success: true, state: next };
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

      const [progressResult, coursesResult, userCoursesResult, achievementsResult, profileResult] = await Promise.all([
        apiJson(`/api/progress?userId=${encodeURIComponent(userId)}`),
        user?.user_metadata?.grade ? apiJson(`/api/courses?grade=${encodeURIComponent(user.user_metadata.grade)}`) : Promise.resolve({ success: true, data: [] }),
        apiJson(`/api/user/courses?userId=${encodeURIComponent(userId)}`),
        apiJson(`/api/achievements?userId=${encodeURIComponent(userId)}`).catch(() => ({ success: true, data: [] })),
        apiJson(`/api/profile?userId=${encodeURIComponent(userId)}&email=${encodeURIComponent(user.email || '')}`).catch(() => ({ success: true, data: null }))
      ]);

      const availableCourses = normalizeCourseList(coursesResult?.data || []);
      const profileData = profileResult?.data || {};
      const achievementCatalog = Array.isArray(achievementsResult?.data) && achievementsResult.data.length ? achievementsResult.data : ACHIEVEMENT_RULES;
      const ownedAchievements = achievementCatalog.filter((achievement) => achievement.owned).map((achievement) => achievement.id);
      const userProgressRows = Array.isArray(userCoursesResult?.data) ? userCoursesResult.data : [];
      const courseProgress = {};

      userProgressRows.forEach((row) => {
        const localCourseState = currentState.courseProgress?.[row.course_id] || {};
        const localStatus = Array.isArray(localCourseState.objectiveStatus)
          ? localCourseState.objectiveStatus
          : Array.isArray(localCourseState.stats?.objectiveStatus)
            ? localCourseState.stats.objectiveStatus
            : [];
        const serverStatus = Array.isArray(row.stats?.objectiveStatus) ? row.stats.objectiveStatus : [];
        const mergedStatusLength = Math.max(localStatus.length, serverStatus.length);
        const mergedObjectiveStatus = Array.from({ length: mergedStatusLength }, (_item, index) => Boolean(localStatus[index] || serverStatus[index]));
        const localFinalTest = localCourseState.stats?.finalTest && typeof localCourseState.stats.finalTest === 'object' ? localCourseState.stats.finalTest : null;
        const serverFinalTest = row.stats?.finalTest && typeof row.stats.finalTest === 'object' ? row.stats.finalTest : null;
        const finalTest = Object.assign({}, serverFinalTest || {}, localFinalTest || {});
        if (serverFinalTest?.draft && !localFinalTest?.draft) finalTest.draft = serverFinalTest.draft;
        if (localFinalTest?.draft) finalTest.draft = localFinalTest.draft;

        courseProgress[row.course_id] = {
          xp: Math.max(Number(localCourseState.xp || 0), Number(row.xp_in_course || 0)),
          questions: Math.max(Number(localCourseState.questions || 0), Number(row.stats?.questionsAnswered || 0)),
          mastery: Math.max(Number(localCourseState.mastery || 0), Math.min(100, Math.floor(Number(row.xp_in_course || 0) / 2))),
          completed: Boolean(localCourseState.completed || row.completed),
          completedAt: localCourseState.completedAt || row.completed_at || '',
          progress_percentage: Math.max(Number(localCourseState.progress_percentage || 0), Number(row.progress_percentage || 0)),
          coins: Math.max(Number(localCourseState.coins || 0), Number(row.coins_earned || 0)),
          userCourseId: row.id,
          objectiveStatus: mergedObjectiveStatus,
          stats: Object.assign({}, row.stats || {}, localCourseState.stats || {}, {
            objectiveStatus: mergedObjectiveStatus,
            finalTest
          })
        };
      });

      const nextState = normalizeState(Object.assign({}, currentState, {
        userId,
        userEmail: user.email || '',
        userGrade: user?.user_metadata?.grade || '',
        alias: profileData.username || user?.user_metadata?.alias || currentState.alias,
        username: profileData.username || '',
        displayName: profileData.display_name || '',
        avatarUrl: profileData.avatar_url || '',
        availableCourses,
        catalogStatus: 'ready',
        catalogError: '',
        xp: Number(progressResult?.data?.total_xp || currentState.xp || 0),
        coins: Number(progressResult?.data?.total_coins || currentState.coins || 0),
        level: Number(progressResult?.data?.global_level || currentState.level || 1),
        streak: Number(progressResult?.data?.current_streak || currentState.streak || 0),
        longestStreak: Number(progressResult?.data?.longest_streak || currentState.longestStreak || 0),
        achievementCatalog,
        achievements: ownedAchievements.length ? ownedAchievements : currentState.achievements,
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
      timestamp: Date.now(),
      metadata: message.metadata || {}
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

  async function loadChatHistory(courseId) {
    if (!currentState.userId || !courseId) {
      return getChatMessages(courseId);
    }

    const existing = getChatMessages(courseId);
    if (existing.length > 0) {
      return existing;
    }

    const response = await apiJson(`/api/chat/messages?userId=${encodeURIComponent(currentState.userId)}&courseId=${encodeURIComponent(courseId)}`);
    const messages = Array.isArray(response?.data) ? response.data.map((item) => ({
      role: item.role === 'assistant' ? 'ai' : item.role,
      text: item.text,
      time: item.created_at ? new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
      metadata: item.metadata || {}
    })) : [];

    const next = normalizeState(currentState);
    if (!next.chatHistory) next.chatHistory = {};
    next.chatHistory[courseId] = messages;
    saveState(next);
    return messages;
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
      get achievements() {
        return getSnapshot().achievementCatalog || ACHIEVEMENT_RULES;
      },
      getSnapshot,
      getState: getSnapshot,
      subscribe,
      useProgress,
      awardProgress,
      spendCoins,
      markObjectiveProgress,
      completeCourse,
      recordFinalTestResult,
      saveFinalTestDraft,
      clearFinalTestDraft,
      setSelectedCourse,
      setAvailableCourses,
      loadCoursesForGrade,
      loadAllCourses,
      setUserContext,
      setAlias,
      getSelectedCourse,
      getNextLevelXp,
      addChatMessage,
      getChatMessages,
      loadChatHistory,
      clearChatHistory,
      updateUserProfile
    };

  }
})();
