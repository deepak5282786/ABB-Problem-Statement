import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as service from './services/game-service.js';
import { sessionHeader, jsonBody, errorHandler } from './middleware/validation.js';

export const app = express();
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('Referrer-Policy', 'same-origin');
  next();
});
const api = express.Router();
api.use(sessionHeader, express.json({ limit: '10kb' }));
api.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});
api.post('/games', jsonBody, async (req, res) => {
  res
    .status(201)
    .json(await service.startGame(req.sessionId, req.body.mode, req.body.expectedRevision));
});
api.get('/games/:id', async (req, res) => {
  res.json(await service.getGame(req.sessionId, req.params.id));
});
api.post('/games/:id/moves', jsonBody, async (req, res) => {
  res.json(await service.submitMove(req.sessionId, req.params.id, req.body));
});
api.post('/games/:id/undo', jsonBody, async (req, res) => {
  res.json(await service.undoMove(req.sessionId, req.params.id, req.body.expectedRevision));
});
api.post('/games/:id/reset', jsonBody, async (req, res) => {
  res.json(await service.resetGame(req.sessionId, req.params.id, req.body.expectedRevision));
});
api.get('/scoreboard', async (req, res) => {
  res.json(await service.getScoreboard(req.sessionId));
});
api.post('/scoreboard/reset', jsonBody, async (req, res) => {
  res.json(await service.resetScoreboard(req.sessionId, req.body.expectedRevision));
});
api.use((req, res) => res.status(404).json({ message: 'Endpoint not found.' }));
app.use('/api', api);
const dist = fileURLToPath(new URL('../../client/dist', import.meta.url));
app.use(express.static(dist));
app.get('/{*path}', (req, res, next) => {
  res.sendFile(path.join(dist, 'index.html'), (error) => {
    if (!error) return;
    if (error.code === 'ENOENT')
      return res
        .status(404)
        .send('Frontend build missing. Run npm run build or use the Vite development server.');
    next(error);
  });
});
app.use(errorHandler);
