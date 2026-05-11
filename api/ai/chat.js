const { getSambaNovaConfig, getFallbackAiResponse, readJsonBody, sendJson } = require('../_shared');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  const { systemPrompt = '', userText = '' } = await readJsonBody(req);
  const sambaNovaConfig = getSambaNovaConfig();

  if (!String(userText).trim()) {
    sendJson(res, 400, { error: 'Missing userText' });
    return;
  }

  if (!sambaNovaConfig.SAMBANOVA_API_KEY) {
    sendJson(res, 200, { text: getFallbackAiResponse(userText), provider: 'fallback' });
    return;
  }

  try {
    const response = await fetch(`${sambaNovaConfig.SAMBANOVA_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${sambaNovaConfig.SAMBANOVA_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: sambaNovaConfig.SAMBANOVA_MODEL,
        messages: [
          ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
          { role: 'user', content: userText }
        ],
        stop: ['<|eot_id|>'],
        stream: false
      })
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      sendJson(res, 200, {
        text: getFallbackAiResponse(userText),
        provider: 'fallback',
        error: payload?.error?.message || payload?.error || `SambaNova request failed with status ${response.status}`
      });
      return;
    }

    const text = payload?.choices?.[0]?.message?.content?.trim() || '';
    if (!text) {
      sendJson(res, 200, { text: getFallbackAiResponse(userText), provider: 'fallback' });
      return;
    }

    sendJson(res, 200, { text, provider: 'sambanova' });
  } catch (error) {
    sendJson(res, 200, { text: getFallbackAiResponse(userText), provider: 'fallback', error: error?.message || String(error) });
  }
};
