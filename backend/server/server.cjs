const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

try {
  process.loadEnvFile(require('path').join(__dirname, '..', '.env'));
} catch (e) {
  // .env not present — rely on process.env already being populated (CI, hosting platform, etc.)
}

const app = express();
const PORT = process.env.PORT || 5000;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// ----------------------------------------------------
// Security headers (helmet)
//
// Two defaults are relaxed deliberately:
//   - contentSecurityPolicy: the /docs Swagger UI page loads its bundle and
//     stylesheet from unpkg.com, which helmet's default `default-src 'self'`
//     would block. The allowance is scoped to those directives only.
//   - crossOriginEmbedderPolicy: off, for the same cross-origin CDN assets.
// crossOriginResourcePolicy is set to cross-origin because this API is
// consumed by a frontend served from a different origin (port 3000).
// ----------------------------------------------------
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", 'https://unpkg.com'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://unpkg.com'],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
);

// ----------------------------------------------------
// CORS allowlist
//
// Read from CORS_ORIGIN as a comma-separated list of exact origins; defaults to
// the local Vite dev host so a fresh clone works with no configuration. A
// deployment sets CORS_ORIGIN to its real frontend origin(s) — the previous
// bare cors() call accepted every origin, which is not a safe default to ship.
//
// Requests with no Origin header (curl, server-to-server, the Appium/automation
// runners) are allowed through: CORS is a browser-enforced policy and blocking
// them would break non-browser clients without adding protection.
// ----------------------------------------------------
const ALLOWED_ORIGINS = (process.env.CORS_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
      // Tagged with a status so the error handler reports a deliberate 403
      // rather than a generic 500 that looks like a server fault.
      const err = new Error(`Origin ${origin} is not allowed by CORS`);
      err.status = 403;
      callback(err);
    },
    credentials: true,
  }),
);

app.use(express.json({ limit: '1mb' }));

// Reject malformed JSON bodies with a 400 instead of letting the SyntaxError
// fall through to the catch-all handler as a 500.
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ error: 'Request body is not valid JSON' });
  }
  next(err);
});

// ----------------------------------------------------
// Rate limiting on the credential endpoints
//
// Scoped to login/register only — the read-heavy data routes are left alone so
// dashboard fan-out (each page issues several parallel GETs) is unaffected.
// The limit is per-IP and generous enough for the test suites in automation/
// and appium-tests/ (neither drives these endpoints directly — the automation
// runner generates reports without issuing HTTP calls, and the Appium suite
// goes through the browser UI), while still cutting off credential stuffing.
// Disabled entirely when RATE_LIMIT_DISABLED=true, for load testing.
// ----------------------------------------------------
const authLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: Number(process.env.RATE_LIMIT_MAX_AUTH) || 50, // per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.RATE_LIMIT_DISABLED === 'true',
  message: { error: 'Too many authentication attempts. Please try again later.' },
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);
app.use('/api/auth/reset-password', authLimiter);

// Request logger middleware to print hit API endpoints and status codes in terminal
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[API HIT] ${req.method} ${req.originalUrl} - Status: ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// ----------------------------------------------------
// Route mounting — every route reads/writes Supabase Postgres via
// server/database/supabaseClient.cjs (service_role key), so this is
// the single source of truth for both the web frontend (when it isn't
// talking to Supabase directly) and any other client (mobile/Appium).
// ----------------------------------------------------
const routers = [
  ['/api/auth', './api/auth.cjs'],
  ['/api/faculty', './api/faculty.cjs'],
  ['/api/slots', './api/slots.cjs'],
  ['/api/bookings', './api/bookings.cjs'],
  ['/api/requests', './api/requests.cjs'],
  ['/api/ratings', './api/ratings.cjs'],
  ['/api/community', './api/community.cjs'],
  ['/api/announcements', './api/announcements.cjs'],
  ['/api/admin', './api/admin.cjs'],
  ['/api/onboarding', './api/onboarding.cjs'],
  ['/api/ai', './api/ai.cjs'],
  ['/api/copilot', './api/copilot.cjs'],
];

for (const [mountPath, modulePath] of routers) {
  try {
    app.use(mountPath, require(modulePath));
  } catch (e) {
    console.warn(`Router at ${mountPath} not available during startup:`, e.message);
  }
}

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    system: 'CampusConnect API',
    database: 'supabase',
    timestamp: new Date().toISOString(),
  });
});

// ----------------------------------------------------
// Swagger / OpenAPI Documentation
// ----------------------------------------------------
const openapiSchema = require('./openapi.cjs');
app.get('/api/openapi.json', (req, res) => res.json(openapiSchema));

app.get('/docs', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>CampusConnect API Documentation</title>
      <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css" />
      <style>
        html { box-sizing: border-box; overflow: -y-scroll; }
        *, *:before, *:after { box-sizing: inherit; }
        body { margin: 0; background: #fafafa; }
      </style>
    </head>
    <body>
      <div id="swagger-ui"></div>
      <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js"></script>
      <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-standalone-preset.js"></script>
      <script>
        window.onload = () => {
          window.ui = SwaggerUIBundle({
            url: '/api/openapi.json',
            dom_id: '#swagger-ui',
            deepLinking: true,
            presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
            layout: "BaseLayout"
          });
        };
      </script>
    </body>
    </html>
  `);
});

// ----------------------------------------------------
// 404 — anything that matched no route above. Declared after every route so it
// only catches genuine misses, and returns JSON rather than Express's default
// HTML error page (an API client parsing the body would otherwise choke).
// ----------------------------------------------------
app.use((req, res) => {
  res.status(404).json({ error: `Cannot ${req.method} ${req.path}` });
});

// ----------------------------------------------------
// Catch-all error handler — routes wrapped in utils/asyncHandler.cjs forward
// here on rejection instead of each repeating its own try/catch.
//
// Must be the LAST app.use: Express only treats a 4-arity middleware as an
// error handler, and only routes registered *before* it forward into it.
// (It previously sat above /api/health and /docs, leaving those uncovered.)
//
// In production the response carries a generic message only: raw driver errors
// leak schema details (column names, constraint names, "invalid input syntax
// for type uuid"), which is reconnaissance material. The real error is always
// logged server-side so nothing is lost operationally.
// ----------------------------------------------------
app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;

  console.error(`[ERROR] ${req.method} ${req.originalUrl} ->`, err.stack || err.message);

  if (res.headersSent) return next(err);

  res.status(status).json({
    error:
      IS_PRODUCTION && status >= 500
        ? 'Internal server error'
        : err.message || 'Internal server error',
  });
});

// Start Background Jobs & Workers
try {
  require('./jobs/reputation_worker.cjs');
  console.log('Background reputation worker started.');
} catch (e) {
  console.error('Failed to initialize reputation worker:', e.message);
}

try {
  require('./jobs/ai_queue.cjs');
  console.log('Background AI queue worker started.');
} catch (e) {
  console.error('Failed to initialize AI queue worker:', e.message);
}

app.listen(PORT, () => {
  console.log(`CampusConnect Backend Server running on http://localhost:${PORT}`);
  console.log(`Database: Supabase (${process.env.SUPABASE_URL || 'NOT CONFIGURED — see backend/.env.example'})`);
  console.log(`API docs: http://localhost:${PORT}/docs`);
  console.log(`CORS allowlist: ${ALLOWED_ORIGINS.join(', ')}`);
});
