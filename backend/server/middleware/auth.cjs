const { verifyAccessToken } = require('../utils/tokens.cjs');

function getBearerToken(req) {
  const header = req.headers['authorization'] || '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
}

// Attaches req.user = { id, email, role } from a valid Bearer token.
// Role is stored uppercase (ADMIN/TEACHER/STUDENT) to match the
// Supabase schema's CHECK constraint and the frontend's expectations.
function authenticateToken(req, res, next) {
  const token = getBearerToken(req);
  if (!token) return res.status(401).json({ error: 'Missing bearer token' });
  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Like authenticateToken, but doesn't fail the request if no/invalid
// token is present — useful for endpoints that behave differently for
// logged-in vs anonymous callers.
function optionalAuth(req, res, next) {
  const token = getBearerToken(req);
  if (!token) return next();
  try {
    req.user = verifyAccessToken(token);
  } catch (e) {
    // ignore invalid token, proceed unauthenticated
  }
  next();
}

function requireRole(...allowedRoles) {
  const roles = allowedRoles.map(r => r.toUpperCase());
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    if (!roles.includes((req.user.role || '').toUpperCase())) {
      return res.status(403).json({ error: `Requires role: ${roles.join(' or ')}` });
    }
    next();
  };
}

module.exports = { authenticateToken, optionalAuth, requireRole };
