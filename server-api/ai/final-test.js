const { getSambaNovaConfig, readJsonBody, sendJson } = require('../_shared');

function hasMetaOptions(question) {
  const text = Array.isArray(question?.options) ? question.options.join(' ').toLowerCase() : '';
  return /\bclear explanation\b|\bphrase about\b|\bunrelated fact\b|\bguess\b|\bstrong answer\b|\bno reasoning\b|\bmain idea\b|\bstudent understands\b|\bignore the course\b|\brepeat only\b|\bgive no reasoning\b|\bdifferent subject\b/.test(text);
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

function shuffleQuestion(question, seed) {
  const options = Array.isArray(question.options) ? question.options.slice(0, 4) : [];
  const correct = Math.max(0, Math.min(options.length - 1, Number(question.correct_index || 0)));
  const correctValue = options[correct];
  const orderPatterns = [
    [0, 1, 2, 3],
    [1, 0, 3, 2],
    [2, 3, 0, 1],
    [3, 2, 1, 0]
  ];
  const order = orderPatterns[Math.abs(Number(seed || 0)) % orderPatterns.length].filter((index) => index < options.length);
  const shuffled = order.map((index) => options[index]);
  return Object.assign({}, question, {
    options: shuffled,
    correct_index: Math.max(0, shuffled.findIndex((option) => option === correctValue))
  });
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
      },
      {
        question: 'In a neutralization equation, where do you usually find the products?',
        options: ['After the reaction arrow.', 'Before the reaction arrow.', 'Inside the acid name only.', 'On the litmus paper.'],
        correct_index: 0,
        explanation: 'Products are written after the reaction arrow.'
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
      },
      {
        question: 'A solution has pH 11. How should it be described?',
        options: ['Basic.', 'Strongly acidic.', 'Neutral.', 'Without any ions.'],
        correct_index: 0,
        explanation: 'A pH above 7 is basic.'
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
      },
      {
        question: 'Which observation best points to an acid?',
        options: ['Sour taste and blue litmus turning red.', 'Slippery feel and red litmus turning blue.', 'No color change with any indicator.', 'Always having pH above 10.'],
        correct_index: 0,
        explanation: 'Acids often taste sour and turn blue litmus red.'
      }
    ];
  }

  if (/\bsolve|word problem|formula|calculate|calculation\b/.test(lowerObjective)) {
    if (/\balgebra|identity|identit|expand|factor|quadratic|polynomial\b/.test(lower)) {
      return [
        {
          question: 'Which expansion of (a + b)^2 is correct?',
          options: ['a^2 + 2ab + b^2', 'a^2 + b^2', 'a^2 - 2ab + b^2', '2a + 2b'],
          correct_index: 0,
          explanation: '(a + b)^2 expands to a^2 + 2ab + b^2.'
        },
        {
          question: 'If a = 2 and b = 3, what is (a + b)^2?',
          options: ['25', '13', '10', '5'],
          correct_index: 0,
          explanation: '(2 + 3)^2 = 5^2 = 25.'
        },
        {
          question: 'Which identity helps expand (x - y)^2?',
          options: ['x^2 - 2xy + y^2', 'x^2 + 2xy + y^2', 'x^2 - y^2', '2x - 2y'],
          correct_index: 0,
          explanation: '(x - y)^2 = x^2 - 2xy + y^2.'
        },
        {
          question: 'What is 7^2 using (a + b)^2 with 7 = 5 + 2?',
          options: ['5^2 + 2(5)(2) + 2^2', '5^2 + 2^2 only', '5 + 2^2', '2(5 + 2)'],
          correct_index: 0,
          explanation: 'Substitute a = 5 and b = 2 into (a + b)^2.'
        }
      ];
    }

    return [
      {
        question: 'A cyclist travels at 5 m/s for 12 s. What distance is covered?',
        options: ['60 m', '17 m', '2.4 m', '7 m'],
        correct_index: 0,
        explanation: 'distance = speed x time = 5 x 12 = 60 m.'
      },
      {
        question: 'A car moves 80 m in 10 s. What is its speed?',
        options: ['8 m/s', '800 m/s', '70 m/s', '90 m/s'],
        correct_index: 0,
        explanation: 'speed = distance / time = 80 / 10 = 8 m/s.'
      },
      {
        question: 'If a runner speeds up from 2 m/s to 6 m/s in 4 s, what is the acceleration?',
        options: ['1 m/s^2', '8 m/s^2', '4 m/s^2', '24 m/s^2'],
        correct_index: 0,
        explanation: 'acceleration = change in velocity / time = (6 - 2) / 4 = 1 m/s^2.'
      },
      {
        question: 'Which line is the correct substitution for distance when speed = 3 m/s and time = 9 s?',
        options: ['d = 3 x 9', 'd = 9 / 3', 'd = 3 + 9', 'd = 9 - 3'],
        correct_index: 0,
        explanation: 'For constant speed, distance = speed x time.'
      }
    ];
  }

  if (/\bnewton|force|mass|acceleration|inertia|third law|second law|first law|motion\b/.test(lower)) {
    return [
      {
        question: 'Which statement best describes Newton\'s Second Law?',
        options: ['Force equals mass times acceleration.', 'Objects keep constant speed only when force increases.', 'Acceleration is never related to force.', 'Mass has no effect on acceleration.'],
        correct_index: 0,
        explanation: 'Newton\'s Second Law is commonly written as F = ma.'
      },
      {
        question: 'A ball rolling in a straight hallway is an example of what kind of motion?',
        options: ['Motion along one line.', 'Motion around a fixed circle.', 'No motion because the hallway is straight.', 'Only acceleration with no position change.'],
        correct_index: 0,
        explanation: 'Straight-line motion happens along one axis or path.'
      },
      {
        question: 'Which example shows inertia?',
        options: ['A book stays still until someone pushes it.', 'A moving object changes direction with no force.', 'A car stops because mass disappears.', 'A cyclist travels distance with no time passing.'],
        correct_index: 0,
        explanation: 'Inertia is an object resisting changes to its motion.'
      },
      {
        question: 'A cyclist moves at 5 m/s for 12 s in a straight line. Which formula finds distance?',
        options: ['distance = speed x time', 'force = mass x acceleration', 'speed = time x distance', 'acceleration = distance x mass'],
        correct_index: 0,
        explanation: 'For constant speed in a straight line, distance = speed x time.'
      },
      {
        question: 'What does velocity include that speed alone does not?',
        options: ['Direction.', 'Mass.', 'Color.', 'Temperature.'],
        correct_index: 0,
        explanation: 'Velocity is speed with direction.'
      },
      {
        question: 'Which situation shows acceleration?',
        options: ['A scooter speeds up from 2 m/s to 6 m/s.', 'A train stays still at a station.', 'A runner keeps exactly the same velocity.', 'A book rests on a desk.'],
        correct_index: 0,
        explanation: 'Acceleration means velocity changes.'
      }
    ];
  }

  if (/\balgebra|identity|identit|expand|factor|quadratic|polynomial\b/.test(lower)) {
    return [
      {
        question: 'What makes an algebraic identity different from an ordinary equation?',
        options: ['It is true for every valid value of its variables.', 'It is true only when x equals 1.', 'It never uses variables.', 'It is always a word problem.'],
        correct_index: 0,
        explanation: 'An identity stays true for all valid variable values.'
      },
      {
        question: 'Which expression is equal to (x + 4)^2?',
        options: ['x^2 + 8x + 16', 'x^2 + 16', 'x^2 + 4x + 4', '2x + 8'],
        correct_index: 0,
        explanation: '(x + 4)^2 = x^2 + 2(x)(4) + 4^2.'
      },
      {
        question: 'Which identity matches a^2 - b^2?',
        options: ['(a + b)(a - b)', '(a + b)^2', '(a - b)^2', 'a^2 + b^2'],
        correct_index: 0,
        explanation: 'The difference of squares factors as (a + b)(a - b).'
      },
      {
        question: 'Why do students use algebraic identities?',
        options: ['To rewrite expressions faster while keeping the same value.', 'To avoid variables completely.', 'To make an expression unrelated to the original.', 'To change every answer into zero.'],
        correct_index: 0,
        explanation: 'Identities are shortcuts that preserve equality.'
      }
    ];
  }

  return [
    {
      question: `Which answer best matches ${topic}?`,
      options: [
        `A correct fact about ${topic}.`,
        `A statement about a different topic.`,
        `A sentence that only says "${String(objective || topic).slice(0, 40)}".`,
        'A claim with no connection to the course.'
      ],
      correct_index: 0,
      explanation: `The correct option stays focused on ${topic}.`
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
  const seen = new Set();
  let cursor = Math.max(0, Number(attempt || 1) - 1);
  while (questions.length < 10 && cursor < templates.length + 20) {
    const template = templates[cursor % templates.length];
    cursor += 1;
    const key = String(template.question || '').toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    questions.push(shuffleQuestion(Object.assign({}, template, {
      question: `${questions.length + 1}. ${template.question}`
    }), questions.length + Number(attempt || 1)));
  }

  while (questions.length < 10) {
    const number = questions.length + 1;
    questions.push(shuffleQuestion({
      question: `${number}. Which statement belongs in a ${topic} answer?`,
      options: [
        `A true ${topic} statement connected to the lesson.`,
        'A fact from an unrelated subject.',
        'A sentence that says only that the student is finished.',
        'A random number with no unit or explanation.'
      ],
      correct_index: 0,
      explanation: `The correct answer stays inside ${topic}.`
    }, number + Number(attempt || 1)));
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

  // Use deterministic course-safe questions for now. This avoids model drift like
  // meta answers, off-subject distractors, repeated questions, or always-A answers.
  sendJson(res, 200, { success: true, provider: 'course-template', test: fallback });
  return;

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
      questions[index] = shuffleQuestion(questions[index], index + Number(attempt || 1));
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
