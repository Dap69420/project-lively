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

function buildFallbackDecision({ userText, systemPrompt = '', courseContext = {}, mode = 'chat' }) {
  const cleanText = String(userText || '').trim();
  const lowerText = cleanText.toLowerCase();
  const objectives = Array.isArray(courseContext.objectives) ? courseContext.objectives.filter(Boolean) : [];
  const isOffTopic = /\b(joke|meme|music|game|random|ignore|skip|off topic)\b/.test(lowerText);
  const isStruggling = cleanText.length < 20 || /\b(don't know|dont know|stuck|help|confused|hard|lost)\b/.test(lowerText);
  const mentionedObjective = objectives.some((objective) => lowerText.includes(String(objective).toLowerCase().slice(0, 18)));
  let xpDelta = isOffTopic ? -8 : isStruggling ? 4 : 10;

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
  const completed = !isOffTopic && !isStruggling && (cleanText.length > 90 || /\b(done|finished|mastered|understand|solved|complete)\b/.test(lowerText));

  return {
    visible_response: isOffTopic
      ? getFallbackAiResponse(cleanText)
      : `I looked at the ${courseContext.title || 'course'} objectives and will keep you moving toward ${objectives[0] || courseContext.aiAim || 'the next step'}.`,
    internal_response: `mode=${mode}; objective_match=${mentionedObjective ? 'yes' : 'no'}; off_topic=${isOffTopic ? 'yes' : 'no'}; struggling=${isStruggling ? 'yes' : 'no'}; xp_delta=${xpDelta}; completed=${completed ? 'yes' : 'no'}`,
    xp_delta: xpDelta,
    coins_delta: coinsDelta,
    completed,
    completion_reason: completed ? 'The student demonstrated enough evidence to finish the course checkpoint.' : '',
    level_delta: 0,
    provider: 'fallback'
  };
}

function normalizeDecision(decision, fallbackDecision) {
  const base = fallbackDecision || buildFallbackDecision({ userText: '' });
  const source = decision && typeof decision === 'object' ? decision : {};
  const visibleResponse = String(source.visible_response || source.text || base.visible_response || '').trim() || base.visible_response;
  const internalResponse = String(source.internal_response || source.admin_response || source.secret_response || base.internal_response || '').trim() || base.internal_response;
  const xpDelta = Number.isFinite(Number(source.xp_delta)) ? Math.round(Number(source.xp_delta)) : base.xp_delta;
  const coinsDelta = Number.isFinite(Number(source.coins_delta)) ? Math.round(Number(source.coins_delta)) : base.coins_delta;
  const completed = typeof source.completed === 'boolean' ? source.completed : base.completed;

  return {
    visible_response: visibleResponse,
    internal_response: internalResponse,
    xp_delta: Math.max(-50, Math.min(50, xpDelta)),
    coins_delta: Math.max(0, Math.min(100, coinsDelta)),
    completed,
    completion_reason: String(source.completion_reason || base.completion_reason || '').trim(),
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
          courseContext.cardStyle && typeof courseContext.cardStyle === 'object' ? `Card style: ${JSON.stringify(courseContext.cardStyle)}` : ''
        ].filter(Boolean).join('\n')
      : '';

    const structuredSystemPrompt = [
      systemPrompt,
      'Return valid JSON only with these keys: visible_response, internal_response, xp_delta, coins_delta, completed, completion_reason, level_delta.',
      'visible_response must be student-safe and should not mention hidden scoring.',
      'internal_response is for admins only and should explain the scoring decision in one short sentence.',
      'xp_delta may be negative, zero, or positive. coins_delta may be zero or positive.',
      'completed should be true only when the current course objective is sufficiently demonstrated.',
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

    const parsedDecision = normalizeDecision(extractJsonObject(text) || { visible_response: text }, fallbackDecision);
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
