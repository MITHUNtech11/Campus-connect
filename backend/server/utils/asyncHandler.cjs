// Wraps an async Express route handler so a thrown/rejected error is
// forwarded to next(err) instead of every route needing its own
// try/catch + res.status(500).json({ error: err.message }). Paired with
// the catch-all error middleware in server.cjs.
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

module.exports = { asyncHandler };
