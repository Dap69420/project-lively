const { getSambaNovaConfig, readJsonBody, sendJson } = require('../_shared');

function localVisionFallback(imageBase64) {
  return imageBase64 ? 'Sketch received. I can see a drawing and I will talk about it in chat.' : 'No sketch image was received.';
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  const { imageBase64 = '', imageUrl = '', prompt = '' } = await readJsonBody(req);
  const sambaNovaConfig = getSambaNovaConfig();

  if ((!String(imageBase64).trim() && !String(imageUrl).trim()) || !String(prompt).trim()) {
    sendJson(res, 400, { error: 'Missing imageBase64 or imageUrl, or prompt' });
    return;
  }

  if (!sambaNovaConfig.SAMBANOVA_API_KEY) {
    sendJson(res, 200, { text: localVisionFallback(imageBase64), provider: 'fallback' });
    return;
  }

  try {
    const candidates = [
      sambaNovaConfig.SAMBANOVA_VISION_MODEL,
      'Llama-4-Maverick-17B-128E-Instruct',
      'Llama-3.2-90B-Vision-Instruct',
      'gemma-3-12b-it'
    ].filter(Boolean);

    let lastError = null;
    for (const model of candidates) {
      try {
        const imageEntry = String(imageUrl).trim()
          ? { type: 'image_url', image_url: { url: imageUrl } }
          : { type: 'image_url', image_url: { url: `data:image/png;base64,${imageBase64}` } };

        const response = await fetch(`${sambaNovaConfig.SAMBANOVA_BASE_URL}/chat/completions`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${sambaNovaConfig.SAMBANOVA_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: 'user',
                content: [
                  { type: 'text', text: prompt },
                  imageEntry
                ]
              }
            ],
            stream: false
          })
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          lastError = payload || { status: response.status };
          continue;
        }

        const text = payload?.choices?.[0]?.message?.content?.trim() || '';
        if (!text) {
          lastError = { message: 'Empty response' };
          continue;
        }

        sendJson(res, 200, { text, provider: `sambanova-vision:${model}` });
        return;
      } catch (err) {
        lastError = err;
      }
    }

    sendJson(res, 200, {
      text: localVisionFallback(imageBase64),
      provider: 'fallback',
      error: lastError?.message || lastError || 'unexpected_error'
    });
  } catch (error) {
    sendJson(res, 200, { text: localVisionFallback(imageBase64), provider: 'fallback', error: error?.message || String(error) });
  }
};
