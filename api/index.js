const routes = [
  { path: '/api/config', handler: require('../server-api/config') },
  { path: '/api/courses', handler: require('../server-api/courses') },
  { path: '/api/user/courses', handler: require('../server-api/user/courses') },
  { path: '/api/progress', handler: require('../server-api/progress') },
  { path: '/api/notes', handler: require('../server-api/notes') },
  { path: '/api/chat/messages', handler: require('../server-api/chat/messages') },
  { path: '/api/ai/chat', handler: require('../server-api/ai/chat') },
  { path: '/api/ai/vision', handler: require('../server-api/ai/vision') },
  { path: '/api/ai/final-test', handler: require('../server-api/ai/final-test') },
  { path: '/api/achievements', handler: require('../server-api/achievements') },
  { path: '/api/admin/courses', handler: require('../server-api/admin/courses') },
  { path: '/api/admin/achievements', handler: require('../server-api/admin/achievements') }
];

module.exports = async (req, res) => {
  const queryPath = req.query?.path
    ? `/api/${Array.isArray(req.query.path) ? req.query.path.join('/') : String(req.query.path)}`
    : '';
  const requestPath = (queryPath || String(req.url || '').split('?')[0]).replace(/\/$/, '') || '/api';
  if (requestPath === '/api/health') {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  const route = routes.find((item) => item.path === requestPath);

  if (!route) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: false, error: `API route not found: ${requestPath}` }));
    return;
  }

  return route.handler(req, res);
};
