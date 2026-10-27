import { GameError } from '../game.js';

export function sessionHeader(req, res, next) {
  const id = req.get('X-Session-Id');
  if (!id || !/^[a-zA-Z0-9-]{16,80}$/.test(id)) {
    throw new GameError('A valid X-Session-Id header is required.');
  }
  req.sessionId = id;
  next();
}
export function jsonBody(req, res, next) {
  if (!req.is('application/json')) throw new GameError('Use Content-Type: application/json.', 415);
  if (!req.body || Array.isArray(req.body) || typeof req.body !== 'object') {
    throw new GameError('The request body must be a JSON object.');
  }
  const { expectedRevision } = req.body;
  if (
    expectedRevision !== undefined &&
    (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0)
  ) {
    throw new GameError('expectedRevision must be a non-negative integer.');
  }
  next();
}
export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  if (error.type === 'entity.parse.failed')
    return res.status(400).json({ message: 'The request body contains invalid JSON.' });
  if (error.type === 'entity.too.large')
    return res.status(413).json({ message: 'The request body is too large.' });
  if (error instanceof GameError)
    return res
      .status(error.status)
      .json({ message: error.message, ...(error.code && { code: error.code }) });
  console.error('API request failed:', error);
  res.status(500).json({ message: 'Something went wrong. Please try again.' });
}
