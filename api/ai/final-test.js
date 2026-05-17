const { getSambaNovaConfig, readJsonBody, sendJson } = require('../_shared');

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

function buildFallbackFinalTest(courseContext = {}, attempt = 1) {
  const title = courseContext.title || courseContext.topic || 'this course';
  const topic = courseContext.topic || courseContext.aiAim || title;
  const objectives = Array.isArray(courseContext.objectives) && courseContext.objectives.length
    ? courseContext.objectives
    : [topic];
  const templates = objectives.flatMap((objective, objectiveIndex) => ([
    {
      question: `Which answer best shows understanding of ${objective}?`,
      options: [
        `A clear explanation of ${objective} with a correct example.`,
        `A phrase about ${objective} with no reasoning.`,
        'An unrelated fact from another lesson.',
        'A guess that avoids the main idea.'
      ],
      correct_index: 0,
      explanation: `The best answer explains ${objective} and connects it to a correct example.`
    },
    {
      question: `What should a strong answer about ${objective} include?`,
      options: [
        'Reasoning plus an example, calculation, or application.',
        'Only the final answer with no work shown.',
        'A topic from a different course.',
        'A statement that the student understands it.'
      ],
      correct_index: 0,
      explanation: 'Strong course answers show the idea and how it works.'
    },
    {
      question: `When using ${objective}, what matters most?`,
      options: [
        'Connecting the concept to the problem or example.',
        'Writing the longest answer possible.',
        'Avoiding all details.',
        'Repeating the objective title exactly.'
      ],
      correct_index: 0,
      explanation: 'Understanding shows up when the concept is applied correctly.'
    }
  ]));

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
