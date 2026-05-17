const { getSambaNovaConfig, getFallbackAiResponse, readJsonBody, sendJson } = require('../_shared');

function extractJsonObject(text) {
  const raw = String(text || '').trim();
  if (!raw) {
    return null;
  }

  const candidates = [raw];
  const fencedMatch = raw.match(/```json\s*([\s\S]*?)```/i) || raw.match(/```\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    candidates.unshift(fencedMatch[1].trim());
  }

  const braceStart = raw.indexOf('{');
  const braceEnd = raw.lastIndexOf('}');
  if (braceStart >= 0 && braceEnd > braceStart) {
    candidates.unshift(raw.slice(braceStart, braceEnd + 1));
  }

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch (_error) {
      // keep trying
    }
  }

  return null;
}

function getQuizTemplate(courseContext, objectives, objectiveIndex) {
  const rawTopic = [
    objectives[objectiveIndex],
    courseContext.topic,
    courseContext.aiAim,
    courseContext.title
  ].map((item) => String(item || '').toLowerCase()).join(' ');

  if (/\bph\b|acid|base|alkali|litmus/.test(rawTopic)) {
    return {
      question: 'Which statement best explains what the pH scale tells us?',
      options: [
        'It measures how acidic or basic a solution is.',
        'It measures only the color of a liquid.',
        'It tells us the mass of a chemical sample.',
        'It shows how fast a reaction always happens.'
      ],
      correct_index: 0,
      explanation: 'The pH scale compares acidity and basicity. Low pH is acidic, high pH is basic, and 7 is neutral.'
    };
  }

  if (/motion|straight line|velocity|speed|acceleration|inertia|force/.test(rawTopic)) {
    return {
      question: 'Which answer best describes motion in a straight line?',
      options: [
        'An object changes position along one path over time.',
        'An object must always move in a circle.',
        'An object has no speed when its position changes.',
        'An object moves only when no force acts on it.'
      ],
      correct_index: 0,
      explanation: 'Straight-line motion means position changes along one line. Speed, velocity, and acceleration describe how that motion changes.'
    };
  }

  const topic = objectives[objectiveIndex] || courseContext.topic || courseContext.aiAim || 'the current idea';
  return {
    question: `Which answer shows the strongest understanding of ${topic}?`,
    options: [
      `A clear explanation of ${topic} with a correct example.`,
      `A memorized phrase about ${topic} with no example.`,
      'An unrelated fact from a different lesson.',
      'A guess that avoids explaining the idea.'
    ],
    correct_index: 0,
    explanation: `The strongest answer explains ${topic} and connects it to a correct example.`
  };
}

function hasMetaQuizOptions(quiz) {
  const optionsText = Array.isArray(quiz?.options) ? quiz.options.join(' ').toLowerCase() : '';
  return /\ba correct explanation\b|\brandom fact\b|\brepeating words\b|\bskipping\b|\bunrelated to the course\b|\bwithout showing understanding\b/.test(optionsText);
}

function hasEnoughObjectiveEvidence({ cleanText, cumulativeText, objectiveText }) {
  const latest = String(cleanText || '').trim();
  const cumulative = String(cumulativeText || '').trim();
  const lowerLatest = latest.toLowerCase();
  const lowerCumulative = cumulative.toLowerCase();
  const objectiveWords = String(objectiveText || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 3 && !['explain', 'solve', 'learn', 'meaning', 'provided', 'buddy'].includes(word));
  const objectiveWordMatches = objectiveWords.filter((word) => {
    const variants = new Set([word]);
    if (word.endsWith('ies')) variants.add(`${word.slice(0, -3)}y`);
    if (word.endsWith('s')) variants.add(word.slice(0, -1));
    variants.add(`${word}s`);
    return Array.from(variants).some((variant) => variant.length > 3 && lowerCumulative.includes(variant));
  });
  const matchedObjectiveWords = new Set(objectiveWordMatches).size;
  const hasReasoning = /\b(because|so that|therefore|which means|this means|as a result|since|so)\b/.test(lowerCumulative);
  const hasApplication = /\b(example|for instance|when|if|using|use|solve|solving|equals|formula|calculate|calculation|step|given|therefore|substitute|apply|applying)\b/.test(lowerCumulative);
  const hasSpecificDetail = /\d|=|\+|-|\*|\/|\^|->|→|:|;|\b(low|high|neutral|acidic|basic|velocity|acceleration|force|speed|distance|time|mass|energy|ratio|function|variable|equation|identity|expression|derivative|calculus)\b/.test(lowerCumulative);
  const hasVagueCompletionClaim = /\b(done|finished|complete|understand|mastered)\b/.test(lowerLatest) && latest.length < 90;
  const hasEnoughLength = latest.length >= 75 || cumulative.length >= 150;
  const requiredObjectiveMatches = objectiveWords.length >= 3 ? 2 : 1;
  const objectiveMatchOk = objectiveWords.length === 0 || matchedObjectiveWords >= requiredObjectiveMatches;
  const evidenceScore = [
    hasEnoughLength,
    hasReasoning,
    hasApplication,
    hasSpecificDetail,
    objectiveMatchOk,
    latest.length >= 140 || cumulative.length >= 260
  ].filter(Boolean).length;

  return !hasVagueCompletionClaim
    && hasEnoughLength
    && hasSpecificDetail
    && objectiveMatchOk
    && evidenceScore >= 4;
}

function buildFallbackDecision({ userText, systemPrompt = '', courseContext = {}, mode = 'chat' }) {
  const cleanText = String(userText || '').trim();
  const lowerText = cleanText.toLowerCase();
  const recentEvidence = Array.isArray(courseContext.recentStudentEvidence)
    ? courseContext.recentStudentEvidence.map((item) => String(item || '').trim()).filter(Boolean)
    : [];
  const cumulativeText = [...recentEvidence, cleanText].join('\n').trim() || cleanText;
  const lowerCumulativeText = cumulativeText.toLowerCase();
  const objectives = Array.isArray(courseContext.objectives) ? courseContext.objectives.filter(Boolean) : [];
  const objectiveStatus = Array.isArray(courseContext.objectiveStatus) ? courseContext.objectiveStatus : [];
  const aiSettings = courseContext.aiSettings && typeof courseContext.aiSettings === 'object' ? courseContext.aiSettings : {};
  const courseAlreadyCompleted = Boolean(courseContext.completed);
  const repeatedInput = Boolean(courseContext.repeatedInput);
  const attemptCount = Math.max(0, Number(courseContext.attemptCount || 0));
  const isOffTopic = /\b(joke|meme|music|game|random|ignore|skip|off topic)\b/.test(lowerText);
  const isStruggling = cleanText.length < 20 || /\b(don't know|dont know|stuck|help|confused|hard|lost)\b/.test(lowerText);
  const mentionedObjectiveIndex = objectives.findIndex((objective) => lowerCumulativeText.includes(String(objective).toLowerCase().slice(0, 18)));
  const firstIncompleteIndex = objectives.findIndex((_objective, index) => !objectiveStatus[index]);
  const objectiveIndex = mentionedObjectiveIndex >= 0 ? mentionedObjectiveIndex : firstIncompleteIndex;
  const mentionedObjective = objectiveIndex >= 0 && (mentionedObjectiveIndex >= 0 || cumulativeText.length > 120);
  const objectiveText = objectives[objectiveIndex] || courseContext.aiAim || courseContext.topic || '';
  const enoughObjectiveEvidence = hasEnoughObjectiveEvidence({ cleanText, cumulativeText, objectiveText });
  let xpDelta = isOffTopic ? -8 : isStruggling ? 4 : 10;

  if (repeatedInput) {
    xpDelta = Math.min(2, xpDelta);
  }

  if (mentionedObjective) {
    xpDelta += 6;
  }

  if (cleanText.length > 140) {
    xpDelta += 4;
  }

  if (mode === 'sketch') {
    xpDelta += 3;
  }

  xpDelta = Math.max(-20, Math.min(40, xpDelta));
  const coinsDelta = xpDelta > 0 ? Math.max(0, Math.floor(xpDelta / 5)) : 0;
  const objectiveCompleted = !courseAlreadyCompleted
    && !repeatedInput
    && !isOffTopic
    && !isStruggling
    && attemptCount >= 3
    && objectiveIndex >= 0
    && mentionedObjective
    && enoughObjectiveEvidence;
  const completedObjectiveIndexes = objectiveCompleted ? [objectiveIndex] : [];
  const completed = objectives.length > 0
    ? objectiveCompleted && objectives.every((_objective, index) => index === objectiveIndex || Boolean(objectiveStatus[index]))
    : objectiveCompleted;
  const quizFrequency = aiSettings.quiz_frequency || 'after_objective';
  const shouldQuiz = Boolean(aiSettings.quiz_enabled)
    && quizFrequency !== 'off'
    && mode === 'chat'
    && !isOffTopic
    && !isStruggling
    && (
      (quizFrequency === 'after_objective' && objectiveCompleted)
      || (quizFrequency === 'every_3_messages' && attemptCount > 0 && attemptCount % 3 === 0)
      || (quizFrequency === 'every_5_messages' && attemptCount > 0 && attemptCount % 5 === 0)
    );
  const quizTopic = objectives[objectiveIndex] || courseContext.topic || courseContext.aiAim || 'this topic';
  const quizTemplate = getQuizTemplate(courseContext, objectives, objectiveIndex);
  const quiz = shouldQuiz ? Object.assign({}, quizTemplate, {
    difficulty: aiSettings.quiz_difficulty || 'mixed'
  }) : null;

  let visibleResponse = '';
  if (isOffTopic) {
    visibleResponse = getFallbackAiResponse(cleanText);
  } else if (repeatedInput) {
    visibleResponse = `Nice consistency. You explained that clearly. Add one new example tied to ${objectives[0] || courseContext.aiAim || courseContext.topic || 'this topic'} so we can push to the next checkpoint.`;
  } else if (objectiveCompleted) {
    visibleResponse = `Strong explanation. You gave enough reasoning and a concrete example for this checkpoint, so I will mark it complete and move you to the next one.`;
  } else if (isStruggling) {
    visibleResponse = `You are close. Start with one short line about ${objectives[0] || courseContext.topic || 'the concept'}, then I will help you refine it.`;
  } else {
    visibleResponse = `Good start. To count this checkpoint, explain the idea in your own words and add one concrete example or calculation from ${courseContext.topic || courseContext.title || 'this lesson'}.`;
  }

  return {
    visible_response: visibleResponse,
    internal_response: `Scored ${xpDelta} XP in ${mode} mode. objective_match=${mentionedObjective ? 'yes' : 'no'}, repeated_input=${repeatedInput ? 'yes' : 'no'}, checkpoint_completed=${completed ? 'yes' : 'no'}.`,
    xp_delta: xpDelta,
    coins_delta: coinsDelta,
    mood: isStruggling ? 'supportive' : objectiveCompleted ? 'excited' : shouldQuiz ? 'curious' : 'focused',
    quiz,
    objective_completed: objectiveCompleted,
    objective_index: objectiveCompleted ? objectiveIndex : null,
    completed_objective_indexes: completedObjectiveIndexes,
    completed,
    completion_reason: objectiveCompleted ? 'The student demonstrated enough evidence to complete the current objective.' : '',
    level_delta: 0,
    provider: 'fallback'
  };
}

function normalizeDecision(decision, fallbackDecision, courseContext = {}) {
  const base = fallbackDecision || buildFallbackDecision({ userText: '' });
  const source = decision && typeof decision === 'object' ? decision : {};
  let visibleResponse = String(source.visible_response || source.text || base.visible_response || '').trim() || base.visible_response;
  const internalResponse = String(source.internal_response || source.admin_response || source.secret_response || base.internal_response || '').trim() || base.internal_response;
  let xpDelta = Number.isFinite(Number(source.xp_delta)) ? Math.round(Number(source.xp_delta)) : base.xp_delta;
  const coinsDelta = Number.isFinite(Number(source.coins_delta)) ? Math.round(Number(source.coins_delta)) : base.coins_delta;
  let completed = typeof source.completed === 'boolean' ? source.completed : base.completed;
  const rawCompletedIndexes = Array.isArray(source.completed_objective_indexes)
    ? source.completed_objective_indexes
    : Array.isArray(source.completedObjectiveIndexes)
      ? source.completedObjectiveIndexes
      : base.completed_objective_indexes || [];
  const completedObjectiveIndexes = rawCompletedIndexes
    .map((index) => Number(index))
    .filter((index) => Number.isInteger(index) && index >= 0);
  const objectiveIndex = Number.isInteger(Number(source.objective_index))
    ? Number(source.objective_index)
    : Number.isInteger(Number(base.objective_index))
      ? Number(base.objective_index)
      : null;
  let objectiveCompleted = typeof source.objective_completed === 'boolean'
    ? source.objective_completed
    : typeof source.completedObjective === 'boolean'
      ? source.completedObjective
      : Boolean(base.objective_completed);
  const mood = ['supportive', 'focused', 'excited', 'curious', 'strict'].includes(String(source.mood || '').toLowerCase())
    ? String(source.mood).toLowerCase()
    : base.mood || 'focused';
  const quizSource = source.quiz && typeof source.quiz === 'object' ? source.quiz : base.quiz;
  let quiz = quizSource && typeof quizSource === 'object' && Array.isArray(quizSource.options) && quizSource.options.length >= 2
    ? {
        question: String(quizSource.question || '').trim(),
        options: quizSource.options.slice(0, 4).map((option) => String(option || '').trim()).filter(Boolean),
        correct_index: Math.max(0, Math.min(3, Math.floor(Number(quizSource.correct_index ?? quizSource.correctIndex ?? 0)))),
        explanation: String(quizSource.explanation || '').trim(),
        difficulty: String(quizSource.difficulty || 'mixed').trim()
      }
    : null;

  if (quiz && hasMetaQuizOptions(quiz)) {
    const objectives = Array.isArray(courseContext.objectives) ? courseContext.objectives : [];
    const fallbackQuiz = getQuizTemplate(courseContext, objectives, objectiveIndex);
    quiz = Object.assign({}, fallbackQuiz, {
      difficulty: quiz.difficulty || fallbackQuiz.difficulty || 'mixed'
    });
  }

  const evidenceText = Array.isArray(courseContext.recentStudentEvidence)
    ? courseContext.recentStudentEvidence.join('\n')
    : '';
  const latestEvidence = Array.isArray(courseContext.recentStudentEvidence) && courseContext.recentStudentEvidence.length
    ? courseContext.recentStudentEvidence[courseContext.recentStudentEvidence.length - 1]
    : '';
  const objectives = Array.isArray(courseContext.objectives) ? courseContext.objectives : [];
  const objectiveText = objectives[objectiveIndex] || courseContext.aiAim || courseContext.topic || '';
  const hasCompletionEvidence = hasEnoughObjectiveEvidence({
    cleanText: latestEvidence,
    cumulativeText: evidenceText,
    objectiveText
  });

  if (objectiveCompleted && !hasCompletionEvidence) {
    objectiveCompleted = false;
    completed = false;
    completedObjectiveIndexes.length = 0;
    visibleResponse = `Good progress. I am not marking this objective complete yet because I need a clearer explanation with an example or calculation. Add one concrete step that shows why your answer works.`;
  }

  if (Boolean(courseContext.completed) || Boolean(courseContext.repeatedInput)) {
    completed = false;
    objectiveCompleted = false;
    completedObjectiveIndexes.length = 0;
  }

  if (completed && xpDelta <= 0) {
    xpDelta = 8;
  }

  return {
    visible_response: visibleResponse,
    internal_response: internalResponse,
    xp_delta: Math.max(-50, Math.min(50, xpDelta)),
    coins_delta: Math.max(0, Math.min(100, coinsDelta)),
    mood,
    quiz: quiz && quiz.question && quiz.options.length >= 2 ? quiz : null,
    objective_completed: objectiveCompleted,
    objective_index: objectiveCompleted ? objectiveIndex : null,
    completed_objective_indexes: completedObjectiveIndexes,
    completed,
    completion_reason: objectiveCompleted ? String(source.completion_reason || base.completion_reason || '').trim() : '',
    level_delta: Number.isFinite(Number(source.level_delta)) ? Math.round(Number(source.level_delta)) : 0,
    provider: source.provider || base.provider || 'fallback'
  };
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  const { systemPrompt = '', userText = '', courseContext = {}, mode = 'chat' } = await readJsonBody(req);
  const sambaNovaConfig = getSambaNovaConfig();
  const fallbackDecision = buildFallbackDecision({ userText, systemPrompt, courseContext, mode });

  if (!String(userText).trim()) {
    sendJson(res, 400, { error: 'Missing userText' });
    return;
  }

  if (!sambaNovaConfig.SAMBANOVA_API_KEY) {
    sendJson(res, 200, {
      text: fallbackDecision.visible_response,
      provider: 'fallback',
      decision: fallbackDecision
    });
    return;
  }

  try {
    const courseContextText = courseContext && typeof courseContext === 'object'
      ? [
          courseContext.title ? `Course: ${courseContext.title}` : '',
          courseContext.grade ? `Grade: ${courseContext.grade}` : '',
          courseContext.subject ? `Subject: ${courseContext.subject}` : '',
          courseContext.topic ? `Topic: ${courseContext.topic}` : '',
          courseContext.aiAim ? `Aim: ${courseContext.aiAim}` : '',
          Array.isArray(courseContext.objectives) && courseContext.objectives.length ? `Objectives:\n- ${courseContext.objectives.join('\n- ')}` : '',
          Array.isArray(courseContext.objectiveStatus) && courseContext.objectiveStatus.length ? `Objective completion status: ${courseContext.objectiveStatus.map((done, index) => `${index}:${done ? 'complete' : 'incomplete'}`).join(', ')}` : '',
          Array.isArray(courseContext.recentStudentEvidence) && courseContext.recentStudentEvidence.length ? `Recent student evidence, oldest to newest:\n- ${courseContext.recentStudentEvidence.join('\n- ')}` : '',
          courseContext.aiSettings && typeof courseContext.aiSettings === 'object' ? `AI behavior settings: ${JSON.stringify(courseContext.aiSettings)}` : '',
          courseContext.cardStyle && typeof courseContext.cardStyle === 'object' ? `Card style: ${JSON.stringify(courseContext.cardStyle)}` : ''
        ].filter(Boolean).join('\n')
      : '';

    const structuredSystemPrompt = [
      systemPrompt,
      'Return valid JSON only with these keys: visible_response, internal_response, xp_delta, coins_delta, mood, quiz, objective_completed, objective_index, completed_objective_indexes, completed, completion_reason, level_delta.',
      'visible_response must be student-safe and should not mention hidden scoring.',
      'visible_response should respond directly to the student answer, not a generic template.',
      'internal_response is for admins only and should explain the scoring decision in one short sentence.',
      'xp_delta may be negative, zero, or positive. coins_delta may be zero or positive.',
      'mood must be one of supportive, focused, excited, curious, strict. Match it to the student state.',
      'quiz may be null, or an MCQ object with question, options, correct_index, explanation, difficulty. Only include a quiz when the AI behavior settings say quizzes are enabled and the timing fits.',
      'When you include a quiz, make every option a real course-content answer. Do not use meta options like "a correct explanation", "random fact", "repeating words", or "skipping the idea".',
      'Quiz explanations should sound like a tutor: briefly explain why the correct answer is right and, if useful, why the tempting wrong answer is wrong.',
      'Evaluate objective completion using the full recent student evidence, not only the latest message.',
      'If earlier messages already covered part of an objective, do not ask the student to repeat that part; ask only for the missing part.',
      'Be strict with objective completion. objective_completed should be true only when one listed incomplete objective is demonstrated with a clear explanation plus a concrete example, calculation, or reasoning chain.',
      'Do not complete an objective from a short answer, a single recalled fact, a guess, or a student merely saying they understand.',
      'objective_index must be the zero-based index of the completed objective, or null when no objective is completed.',
      'completed_objective_indexes should list all zero-based objective indexes completed by this answer.',
      'completed should be true only when this answer completes the final remaining objective in the course.',
      'Never mark completed if the student is repeating the same answer with no new evidence, or if the course is already completed.',
      courseContextText ? `Course context:\n${courseContextText}` : ''
    ].filter(Boolean).join('\n\n');

    const response = await fetch(`${sambaNovaConfig.SAMBANOVA_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${sambaNovaConfig.SAMBANOVA_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: sambaNovaConfig.SAMBANOVA_MODEL,
        messages: [
          { role: 'system', content: structuredSystemPrompt },
          { role: 'user', content: userText }
        ],
        stop: ['<|eot_id|>'],
        stream: false
      })
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      sendJson(res, 200, {
        text: fallbackDecision.visible_response,
        provider: 'fallback',
        error: payload?.error?.message || payload?.error || `SambaNova request failed with status ${response.status}`,
        decision: fallbackDecision
      });
      return;
    }

    const text = payload?.choices?.[0]?.message?.content?.trim() || '';
    if (!text) {
      sendJson(res, 200, { text: fallbackDecision.visible_response, provider: 'fallback', decision: fallbackDecision });
      return;
    }

    const parsedDecision = normalizeDecision(extractJsonObject(text) || { visible_response: text }, fallbackDecision, courseContext);
    sendJson(res, 200, {
      text: parsedDecision.visible_response,
      provider: 'sambanova',
      decision: Object.assign({}, parsedDecision, { provider: 'sambanova' })
    });
  } catch (error) {
    sendJson(res, 200, {
      text: fallbackDecision.visible_response,
      provider: 'fallback',
      error: error?.message || String(error),
      decision: fallbackDecision
    });
  }
};
