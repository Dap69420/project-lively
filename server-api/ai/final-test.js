const { getSambaNovaConfig, readJsonBody, sendJson } = require('../_shared');

function hasMetaOptions(question) {
  const text = Array.isArray(question?.options) ? question.options.join(' ').toLowerCase() : '';
  return /\bclear explanation\b|\bphrase about\b|\bunrelated fact\b|\bguess\b|\bstrong answer\b|\bno reasoning\b|\bmain idea\b|\bstudent understands\b/.test(text);
}

function normalizeQuestion(item, index, fallbackTopic) {
  const source = item && typeof item === 'object' ? item : {};
  const options = Array.isArray(source.options)
    ? source.options.map((option) => String(option || '').trim()).filter(Boolean).slice(0, 4)
    : [];

  while (options.length < 4) {
    options.push(`Option ${options.length + 1}`);
  }

  return {
    question: String(source.question || `Question ${index + 1}: Which answer best fits ${fallbackTopic}?`).trim(),
    options,
    correct_index: Math.max(0, Math.min(3, Math.floor(Number(source.correct_index ?? source.correctIndex ?? 0)))),
    explanation: String(source.explanation || 'Review the course objective and compare it with the correct answer.').trim()
  };
}

function topicQuestionSet(objective, topic, objectiveIndex) {
  const lowerObjective = String(objective || '').toLowerCase();
  const lowerTopic = String(topic || '').toLowerCase();
  const lower = `${lowerObjective} ${lowerTopic}`;

  if (/\bneutralization|reactants|products\b/.test(lowerObjective)) {
    return [
      {
        question: 'In hydrochloric acid + sodium hydroxide -> sodium chloride + water, which are the reactants?',
        options: ['Hydrochloric acid and sodium hydroxide.', 'Sodium chloride and water.', 'Only water.', 'Only sodium chloride.'],
        correct_index: 0,
        explanation: 'Reactants are the substances present before the reaction arrow.'
      },
      {
        question: 'What are the products in HCl + NaOH -> NaCl + H2O?',
        options: ['Sodium chloride and water.', 'Hydrochloric acid and sodium hydroxide.', 'Hydrogen gas and oxygen gas.', 'Litmus and pH paper.'],
        correct_index: 0,
        explanation: 'Products are written after the reaction arrow.'
      },
      {
        question: 'What type of reaction is acid + base -> salt + water?',
        options: ['Neutralization.', 'Photosynthesis.', 'Evaporation.', 'Melting.'],
        correct_index: 0,
        explanation: 'An acid and base reacting to form salt and water is neutralization.'
      }
    ];
  }

  if (/\b(ph|acidic|basic solution|strength)\b/.test(lowerObjective)) {
    return [
      {
        question: 'A solution has pH 2. What does that tell you?',
        options: ['It is strongly acidic.', 'It is neutral.', 'It is strongly basic.', 'It has no hydrogen ions.'],
        correct_index: 0,
        explanation: 'Lower pH values show stronger acidity.'
      },
      {
        question: 'Which pH value is neutral at school-lab level?',
        options: ['7', '1', '13', '0'],
        correct_index: 0,
        explanation: 'pH 7 is neutral; below 7 is acidic and above 7 is basic.'
      },
      {
        question: 'Which change usually means acidity is increasing?',
        options: ['pH goes from 5 to 2.', 'pH goes from 2 to 7.', 'pH goes from 8 to 12.', 'pH stays at 7.'],
        correct_index: 0,
        explanation: 'A lower pH means the solution is more acidic.'
      }
    ];
  }

  if (/\bacid|base|litmus|indicator|differentiate|sensory\b/.test(lowerObjective)) {
    return [
      {
        question: 'What does blue litmus paper do in an acid?',
        options: ['It turns red.', 'It turns blue.', 'It turns into salt.', 'It measures mass.'],
        correct_index: 0,
        explanation: 'Acids turn blue litmus paper red.'
      },
      {
        question: 'Which property best describes many bases?',
        options: ['They feel slippery and turn red litmus blue.', 'They always taste sour and turn blue litmus red.', 'They have no effect on indicators.', 'They are always neutral at pH 7.'],
        correct_index: 0,
        explanation: 'Bases often feel slippery and turn red litmus paper blue.'
      },
      {
        question: 'Which pair correctly compares acids and bases?',
        options: ['Acids turn blue litmus red; bases turn red litmus blue.', 'Acids and bases both turn litmus purple.', 'Bases always taste sour; acids always feel slippery.', 'Acids are always pH 14; bases are always pH 0.'],
        correct_index: 0,
        explanation: 'Litmus color change is a common way to compare acids and bases.'
      }
    ];
  }

  if (/\bnewton|force|mass|acceleration|inertia|third law|second law|first law|motion\b/.test(lower)) {
    return [
      {
        question: 'Which statement best describes Newton\'s Second Law?',
        options: ['Force equals mass times acceleration.', 'Objects always move in circles.', 'Every liquid has pH 7.', 'Energy is always destroyed.'],
        correct_index: 0,
        explanation: 'Newton\'s Second Law is commonly written as F = ma.'
      },
      {
        question: 'A ball rolling in a straight hallway is an example of what kind of motion?',
        options: ['Motion along one line.', 'Random circular motion.', 'No motion at all.', 'A chemical reaction.'],
        correct_index: 0,
        explanation: 'Straight-line motion happens along one axis or path.'
      },
      {
        question: 'Which example shows inertia?',
        options: ['A book stays still until someone pushes it.', 'Salt dissolves in water.', 'Litmus changes color.', 'A plant grows leaves.'],
        correct_index: 0,
        explanation: 'Inertia is an object resisting changes to its motion.'
      }
    ];
  }

  return [
    {
      question: `Which statement correctly applies checkpoint ${objectiveIndex + 1} to ${topic}?`,
      options: [
        `It explains ${objective} using a specific example from ${topic}.`,
        `It repeats ${objective} without any example.`,
        'It switches to a different subject.',
        'It says the answer is finished without showing why.'
      ],
      correct_index: 0,
      explanation: 'A strong answer applies the checkpoint to the course topic with evidence.'
    }
  ];
}

function buildFallbackFinalTest(courseContext = {}, attempt = 1) {
  const title = courseContext.title || courseContext.topic || 'this course';
  const topic = courseContext.topic || courseContext.aiAim || title;
  const objectives = Array.isArray(courseContext.objectives) && courseContext.objectives.length
    ? courseContext.objectives
    : [topic];
  const templates = objectives.flatMap((objective, objectiveIndex) => topicQuestionSet(objective, topic, objectiveIndex));

  const questions = [];
  for (let i = 0; i < 10; i += 1) {
    const template = templates[(i + attempt - 1) % templates.length];
    questions.push(Object.assign({}, template, {
      question: `${i + 1}. ${template.question}`
    }));
  }

  return {
    title: `${title} Final Test`,
    pass_score: 4,
    questions
  };
}

function extractJsonObject(text) {
  const raw = String(text || '').trim();
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1));
  } catch (_error) {
    return null;
  }
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  const { courseContext = {}, attempt = 1 } = await readJsonBody(req);
  const fallback = buildFallbackFinalTest(courseContext, Number(attempt || 1));
  const config = getSambaNovaConfig();

  if (!config.SAMBANOVA_API_KEY) {
    sendJson(res, 200, { success: true, provider: 'fallback', test: fallback });
    return;
  }

  try {
    const prompt = [
      'Create a final mastery test for a student who completed all objectives.',
      'Return valid JSON only with keys: title, pass_score, questions.',
      'questions must be exactly 10 multiple-choice questions.',
      'Each question must have: question, options, correct_index, explanation.',
      'Each options array must have exactly 4 real course-content answers.',
      'Set pass_score to 4.',
      `Course context: ${JSON.stringify(courseContext)}`
    ].join('\n');

    const response = await fetch(`${config.SAMBANOVA_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.SAMBANOVA_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: config.SAMBANOVA_MODEL,
        messages: [{ role: 'user', content: prompt }],
        stream: false
      })
    });

    const payload = await response.json().catch(() => ({}));
    const text = payload?.choices?.[0]?.message?.content || '';
    const parsed = response.ok ? extractJsonObject(text) : null;
    const questions = Array.isArray(parsed?.questions)
      ? parsed.questions.slice(0, 10).map((item, index) => normalizeQuestion(item, index, courseContext.topic || courseContext.title || 'this course'))
      : fallback.questions;

    questions.forEach((question, index) => {
      if (hasMetaOptions(question)) {
        questions[index] = fallback.questions[index] || fallback.questions[index % fallback.questions.length];
      }
    });

    while (questions.length < 10) {
      questions.push(fallback.questions[questions.length]);
    }

    sendJson(res, 200, {
      success: true,
      provider: parsed ? 'sambanova' : 'fallback',
      test: {
        title: String(parsed?.title || fallback.title),
        pass_score: 4,
        questions
      }
    });
  } catch (error) {
    sendJson(res, 200, { success: true, provider: 'fallback', error: error?.message || String(error), test: fallback });
  }
};
