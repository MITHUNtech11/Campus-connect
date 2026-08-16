// Resolves the effective actor id for a route usable both by a
// self-service caller (id comes from their own token) and an admin/staff
// caller acting on someone else's behalf (id comes from the request body).
function resolveActorId(req, role, bodyField) {
  return req.user.role === role ? req.user.id : req.body[bodyField];
}

function todayDateString() {
  return new Date().toISOString().split('T')[0];
}

// Sends 403 and returns true if the caller is `role` but doesn't own the
// resource (ownerId !== req.user.id) — the "self, or a more privileged
// role" check repeated across bookings/slots/faculty routes. Callers
// should `return` immediately when this returns true.
function denyIfNotOwner(req, res, role, ownerId, message) {
  if (req.user.role === role && ownerId !== req.user.id) {
    res.status(403).json({ error: message });
    return true;
  }
  return false;
}

module.exports = { resolveActorId, todayDateString, denyIfNotOwner };
