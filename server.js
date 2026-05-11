const express = require('express');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();
const publicDir = path.join(__dirname, 'public');
// Increase JSON body size to allow base64 images (adjust as needed)
app.use(express.json({ limit: '12mb' }));

function pickEnv(...names) {
  for (const name of names) {
    if (process.env[name]) {
      return process.env[name];
    }
  }
  return '';
}

const fallbackSambaNovaConfig = {
  SAMBANOVA_BASE_URL: 'https://api.sambanova.ai/v1',
  SAMBANOVA_MODEL: 'gpt-oss-120b',
  SAMBANOVA_VISION_MODEL: 'Llama-3.2-90B-Vision-Instruct'
};

function getSupabaseConfig() {
  return {
    SUPABASE_URL: pickEnv('SUPABASE_URL', 'MAIN_SUPABASE_URL', 'MAIN_MAINSUPABASE_URL'),
    SUPABASE_ANON_KEY: pickEnv('SUPABASE_ANON_KEY', 'MAIN_SUPABASE_ANON_KEY', 'MAIN_MAINSUPABASE_ANON_KEY')
  };
}

function getSambaNovaConfig() {
  return {
    SAMBANOVA_API_KEY: pickEnv('SAMBANOVA_API_KEY', 'MAIN_SAMBANOVA_API_KEY'),
    SAMBANOVA_BASE_URL: pickEnv('SAMBANOVA_BASE_URL', 'MAIN_SAMBANOVA_BASE_URL') || fallbackSambaNovaConfig.SAMBANOVA_BASE_URL,
    SAMBANOVA_MODEL: pickEnv('SAMBANOVA_MODEL', 'MAIN_SAMBANOVA_MODEL') || fallbackSambaNovaConfig.SAMBANOVA_MODEL,
    SAMBANOVA_VISION_MODEL: pickEnv('SAMBANOVA_VISION_MODEL', 'MAIN_SAMBANOVA_VISION_MODEL') || fallbackSambaNovaConfig.SAMBANOVA_VISION_MODEL
  };
}

function getFallbackAiResponse(userText) {
  const isStruggling = userText.length < 15 || userText.toLowerCase().includes("don't know") || userText.toLowerCase().includes('stuck');
  return isStruggling
    ? "That's okay! Think about when you're riding a bike and suddenly hit the brakes. What happens to your body?"
    : "Spot on! That's inertia in action. Now, can you apply that to a spaceship in deep space?";
}

const cliPortIndex = process.argv.indexOf('--port');
const cliPort = cliPortIndex >= 0 ? Number(process.argv[cliPortIndex + 1]) : undefined;
const port = Number(cliPort || process.env.PORT || 3000);

app.get('/config.js', (_req, res) => {
  res.type('application/javascript');
  res.setHeader('Cache-Control', 'no-store');
  res.send(`window.__APP_CONFIG__ = ${JSON.stringify(getSupabaseConfig())};`);
});

app.get('/api/config', (_req, res) => {
  res.type('application/javascript');
  res.setHeader('Cache-Control', 'no-store');
  res.send(`window.__APP_CONFIG__ = ${JSON.stringify(getSupabaseConfig())};`);
});

app.get(['/login', '/profile', '/workspace', '/founders'], (req, res) => {
  const page = req.path.slice(1);
  res.sendFile(path.join(publicDir, `${page}.html`));
});

app.use(express.static(publicDir));

app.get('/', (_req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.get('/api/health', (_req, res) => {
  const config = getSupabaseConfig();
  const sambaNovaConfig = getSambaNovaConfig();
  res.json({
    ok: true,
    port,
    hasSupabaseConfig: Boolean(config.SUPABASE_URL && config.SUPABASE_ANON_KEY),
    hasSambaNovaKey: Boolean(sambaNovaConfig.SAMBANOVA_API_KEY)
  });
});

app.post('/api/ai/chat', async (req, res) => {
  const { systemPrompt = '', userText = '' } = req.body || {};
  const sambaNovaConfig = getSambaNovaConfig();

  if (!userText.trim()) {
    return res.status(400).json({ error: 'Missing userText' });
  }

  if (!sambaNovaConfig.SAMBANOVA_API_KEY) {
    return res.json({ text: getFallbackAiResponse(userText), provider: 'fallback' });
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
      return res.json({
        text: getFallbackAiResponse(userText),
        provider: 'fallback',
        error: payload?.error?.message || payload?.error || `SambaNova request failed with status ${response.status}`
      });
    }

    const text = payload?.choices?.[0]?.message?.content?.trim() || '';

    if (!text) {
      return res.json({ text: getFallbackAiResponse(userText), provider: 'fallback' });
    }

    return res.json({ text, provider: 'sambanova' });
  } catch (error) {
    console.error('SambaNova proxy error:', error);
    return res.json({ text: getFallbackAiResponse(userText), provider: 'fallback' });
  }
});

app.post('/api/ai/vision', async (req, res) => {
  const { imageBase64 = '', imageUrl = '', prompt = '' } = req.body || {};
  const sambaNovaConfig = getSambaNovaConfig();

  if ((!imageBase64.trim() && !imageUrl.trim()) || !prompt.trim()) {
    return res.status(400).json({ error: 'Missing imageBase64 or imageUrl, or prompt' });
  }

  if (!sambaNovaConfig.SAMBANOVA_API_KEY) {
    return res.json({ text: 'Vision analysis unavailable - no API key configured', provider: 'fallback' });
  }

  try {
    // Build list of vision model candidates to try if the primary returns errors
    const candidates = [
      sambaNovaConfig.SAMBANOVA_VISION_MODEL,
      'Llama-4-Maverick-17B-128E-Instruct',
      'Llama-3.2-90B-Vision-Instruct',
      'gemma-3-12b-it'
    ].filter(Boolean);

    let lastError = null;
    for (const model of candidates) {
      try {
        const imageEntry = imageUrl.trim()
          ? { type: 'image_url', image_url: { url: imageUrl } }
          : { type: 'image_url', image_url: { url: `data:image/png;base64,${imageBase64}` } };

        const requestBody = {
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
        };

        const response = await fetch(`${sambaNovaConfig.SAMBANOVA_BASE_URL}/chat/completions`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${sambaNovaConfig.SAMBANOVA_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        });

        const payload = await response.json().catch(() => ({}));

        console.log('SambaNova Vision Response:', { model, status: response.status, ok: response.ok, payload });

        if (!response.ok) {
          lastError = payload || { status: response.status };
          // If the service returns 410 or 5xx, try the next model candidate
          continue;
        }

        const text = payload?.choices?.[0]?.message?.content?.trim() || '';
        if (!text) {
          lastError = { message: 'Empty response' };
          continue;
        }

        return res.json({ text, provider: `sambanova-vision:${model}` });
      } catch (err) {
        console.error('Vision attempt error for model', model, err);
        lastError = err;
        continue;
      }
    }

    console.error('All vision attempts failed:', lastError);
    return res.json({ text: 'Unable to analyze sketch', provider: 'fallback', error: lastError?.message || lastError });
  } catch (error) {
    console.error('SambaNova vision proxy error:', error);
    return res.json({ text: 'Error analyzing sketch', provider: 'fallback' });
  }
});

app.listen(port, () => {
  console.log(`Project Lively server running on http://localhost:${port}`);
});