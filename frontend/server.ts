/**
 * Frontend host process.
 *
 * This server exists only to serve the React app — Vite middleware + HMR in
 * development, static `dist/` in production. It holds NO application data and
 * exposes NO API: every read/write goes straight from the browser to the real
 * CampusConnect backend (backend/server/server.cjs, default
 * http://localhost:5000), configured via VITE_API_URL and consumed through
 * src/lib/api.ts. The former in-memory "Dummy Database" and its mock
 * endpoints — along with the Gemini/@google/genai integration — have been
 * removed; AI features are served by the backend's own /api/ai routes.
 */

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CampusConnect frontend running on http://localhost:${PORT}`);
    console.log(`Talking to backend API at ${process.env.VITE_API_URL || 'http://localhost:5000'}`);
  });
}

startServer();
