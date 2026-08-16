// Lightweight request-validation helpers.
//
// Purpose: stop malformed input from reaching Postgres, where it surfaces as a
// driver-level exception ("invalid input syntax for type uuid", "violates check
// constraint", "malformed array literal") that the catch-all error handler then
// turns into a 500 leaking schema internals. These helpers let a route reject
// the same input up front with a 400 and a message that means something to the
// caller.
//
// This is deliberately not a schema framework (no zod/joi) — it covers the
// concrete failure modes the API actually exhibits and nothing more.

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

function isUuid(value) {
  return typeof value === 'string' && UUID_RE.test(value);
}

/**
 * Guards a UUID route/query param. Sends 400 and returns false when invalid,
 * so callers do: `if (!requireUuid(res, id, 'id')) return;`
 */
function requireUuid(res, value, fieldName) {
  if (isUuid(value)) return true;
  res.status(400).json({ error: `${fieldName} must be a valid UUID` });
  return false;
}

/** True only for a non-empty string — rejects numbers, objects, null, ''. */
function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Validates that every named field is a non-empty string. Returns the name of
 * the first offending field, or null when all are fine.
 */
function firstInvalidString(source, fields) {
  for (const field of fields) {
    if (!isNonEmptyString(source[field])) return field;
  }
  return null;
}

/** True for an integer (or integer-valued number) within [min, max]. */
function isIntInRange(value, min, max) {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isInteger(n) && n >= min && n <= max;
}

/** True when the value is absent, or an array of strings. */
function isOptionalStringArray(value) {
  return value === undefined || (Array.isArray(value) && value.every((v) => typeof v === 'string'));
}

module.exports = {
  isUuid,
  requireUuid,
  isNonEmptyString,
  firstInvalidString,
  isIntInRange,
  isOptionalStringArray,
};
