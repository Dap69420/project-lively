const { createClient } = require('@supabase/supabase-js');
const { pickEnv } = require('../_shared');

function getAdminAllowlist() {
  return String(process.env.ADMIN_ALLOWED_EMAILS || '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

function getSupabaseAdminClient() {
  const supabaseUrl = pickEnv('SUPABASE_URL', 'MAIN_SUPABASE_URL', 'MAIN_MAINSUPABASE_URL');
  const serviceRoleKey = pickEnv('SUPABASE_SERVICE_ROLE_KEY', 'MAIN_SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase admin auth is not configured');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function getBearerToken(req) {
  const authorization = req.headers.authorization || req.headers.Authorization || '';
  if (!authorization.startsWith('Bearer ')) {
    return '';
  }
  return authorization.slice('Bearer '.length).trim();
}

async function requireAdminUser(req) {
  const token = getBearerToken(req);

  if (!token) {
    return { ok: false, status: 401, error: 'Missing authorization token' };
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data?.user) {
    return { ok: false, status: 401, error: 'Invalid or expired session' };
  }

  const user = data.user;
  const allowlist = getAdminAllowlist();
  const email = String(user.email || '').toLowerCase();
  const isAllowlisted = allowlist.length > 0 && allowlist.includes(email);
  const isMarkedAdmin = user.user_metadata?.isAdmin === true || user.app_metadata?.isAdmin === true;

  if (!isAllowlisted && !isMarkedAdmin) {
    return { ok: false, status: 403, error: 'You are not allowed to access the admin panel' };
  }

  return { ok: true, user };
}

module.exports = {
  getAdminAllowlist,
  getSupabaseAdminClient,
  requireAdminUser,
};