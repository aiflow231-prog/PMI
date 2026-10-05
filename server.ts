import http from 'http';
import path from 'path';
import express from 'express';
import dotenv from 'dotenv';
import { WebSocketServer } from 'ws';
import { apiRouter } from './src/server/routes/apiRouter.js';
import { getPersistenceAdapter } from './src/server/storage/db.js';
import { LiveSessionManager } from './src/server/gemini/liveSession.js';

dotenv.config();

const PORT = Number(process.env.PORT) || 3000;
const app = express();
const server = http.createServer(app);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Attach API Routes
app.use('/api', apiRouter);

// WebSocket server for Gemini Live Voice Audio Stream (/live)
const wss = new WebSocketServer({ server, path: '/live' });
wss.on('connection', (ws) => {
  console.log('[WebSocket] Client connected to /live');
  LiveSessionManager.handleConnection(ws);
});

async function startServer() {
  try {
    // Initialize persistent SQLite database & seed data
    console.log('[Server] Initializing persistence adapter...');
    await getPersistenceAdapter();
    console.log('[Server] Persistence adapter initialized.');

    if (process.env.NODE_ENV === 'production') {
      const distPath = path.resolve(process.cwd(), 'dist');
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    } else {
      // In development, mount Vite middleware
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    }

    server.listen(PORT, '0.0.0.0', () => {
      console.log(`[PMI Server] Personal Meaning Index running at http://0.0.0.0:${PORT}`);
    });
  } catch (err) {
    console.error('[Server] Fatal startup error:', err);
    process.exit(1);
  }
}

startServer();
