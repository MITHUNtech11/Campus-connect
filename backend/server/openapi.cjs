// OpenAPI 3.0 schema served at /api/openapi.json and rendered at /docs.
// Kept as plain data separate from server.cjs for readability.
module.exports = {
  openapi: '3.0.0',
  info: {
    title: '🎓 CampusConnect API Documentation',
    version: '3.0.0',
    description: 'CampusConnect backend, backed entirely by Supabase Postgres via a service-role key. Bearer JWT auth (see /api/auth) protects write operations.',
  },
  servers: [{ url: 'http://localhost:5000', description: 'Local Development Server' }],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
  },
  paths: {
    '/api/auth/register': {
      post: { summary: 'Register a new account', responses: { 201: { description: 'Account created; returns access + refresh tokens.' } } },
    },
    '/api/auth/login': {
      post: { summary: 'Authenticate and issue JWT access + refresh tokens', responses: { 200: { description: 'Login successful.' }, 401: { description: 'Invalid credentials.' } } },
    },
    '/api/auth/refresh': {
      post: { summary: 'Rotate a refresh token for a new access token', responses: { 200: { description: 'New token pair issued.' } } },
    },
    '/api/auth/logout': {
      post: { summary: 'Revoke a refresh token', responses: { 200: { description: 'Logged out.' } } },
    },
    '/api/auth/me': {
      get: { summary: 'Get the authenticated user profile', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Current user.' } } },
    },
    '/api/auth/profile': {
      patch: { summary: 'Update own name/department', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Updated profile.' } } },
    },
    '/api/auth/change-password': {
      post: { summary: 'Change password (revokes existing sessions)', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Password changed.' } } },
    },
    '/api/auth/forgot-password': {
      post: { summary: 'Request a password reset link', responses: { 200: { description: 'Reset link generated (emailed in production).' } } },
    },
    '/api/auth/reset-password': {
      post: { summary: 'Reset password using a reset token', responses: { 200: { description: 'Password reset.' } } },
    },
    '/api/faculty': {
      get: { summary: 'Faculty directory with live status', responses: { 200: { description: 'List of teachers with cabin/status info.' } } },
    },
    '/api/faculty/{id}/status': {
      patch: { summary: 'Update a teacher’s live status', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Updated status.' } } },
    },
    '/api/slots': {
      get: { summary: 'List consultation slots', parameters: [{ name: 'teacher_id', in: 'query', schema: { type: 'string' } }], responses: { 200: { description: 'List of slots.' } } },
      post: { summary: 'Create a slot (teacher/admin)', security: [{ bearerAuth: [] }], responses: { 201: { description: 'Slot created.' } } },
    },
    '/api/slots/{id}': {
      delete: { summary: 'Delete an unbooked slot (teacher/admin)', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Deleted.' } } },
    },
    '/api/bookings': {
      get: { summary: 'List bookings', security: [{ bearerAuth: [] }], responses: { 200: { description: 'List of bookings.' } } },
      post: { summary: 'Book a slot (student)', security: [{ bearerAuth: [] }], responses: { 201: { description: 'Booking created.' } } },
    },
    '/api/bookings/{id}/status': {
      patch: { summary: 'Update booking status', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Updated booking.' } } },
    },
    '/api/bookings/{id}/no_show': {
      post: { summary: 'Mark a booking as a no-show (teacher/admin)', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Marked.' } } },
    },
    '/api/bookings/{id}': {
      delete: { summary: 'Cancel a booking', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Cancelled.' } } },
    },
    '/api/ratings/{teacher_id}': {
      get: { summary: 'Get ratings for a teacher', responses: { 200: { description: 'List of ratings.' } } },
    },
    '/api/ratings': {
      post: { summary: 'Submit a rating (student)', security: [{ bearerAuth: [] }], responses: { 201: { description: 'Rating recorded.' } } },
    },
    '/api/community': {
      get: { summary: 'List community Q&A posts', responses: { 200: { description: 'List of posts.' } } },
      post: { summary: 'Create a doubt post', security: [{ bearerAuth: [] }], responses: { 201: { description: 'Post created.' } } },
    },
    '/api/announcements': {
      get: { summary: 'List announcements', responses: { 200: { description: 'List of announcements.' } } },
      post: { summary: 'Create an announcement (teacher/admin)', security: [{ bearerAuth: [] }], responses: { 201: { description: 'Created.' } } },
    },
    '/api/admin/users': {
      get: { summary: 'List all users (admin)', security: [{ bearerAuth: [] }], responses: { 200: { description: 'List of users.' } } },
      post: { summary: 'Create a user (admin)', security: [{ bearerAuth: [] }], responses: { 201: { description: 'User created.' } } },
    },
    '/api/admin/stats': {
      get: { summary: 'Dashboard aggregate stats (admin)', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Aggregate counts.' } } },
    },

    '/api/copilot/ask': {
      post: {
        summary: 'Ask the campus copilot a question — real retrieval over live Supabase data (availability, office hours, announcements, campus activity, open slots), no third-party LLM.',
        responses: { 200: { description: 'Templated reply plus the raw retrieved records as `data`.' }, 400: { description: 'message is required.' } },
      },
    },
  },
};
