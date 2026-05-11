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
  const text = String(userText || '');
  const isStruggling = text.length < 15 || text.toLowerCase().includes("don't know") || text.toLowerCase().includes('stuck');
  return isStruggling
    ? "That's okay! Think about when you're riding a bike and suddenly hit the brakes. What happens to your body?"
    : "Spot on! That's inertia in action. Now, can you apply that to a spaceship in deep space?";
}

async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) {
    return {};
  }
  try {
    return JSON.parse(raw);
  } catch (_error) {
    return {};
  }
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}

module.exports = {
  pickEnv,
  fallbackSambaNovaConfig,
  getSupabaseConfig,
  getSambaNovaConfig,
  getFallbackAiResponse,
  readJsonBody,
  sendJson
};
