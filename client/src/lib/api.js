const SESSION_KEY = 'ttt-session';
let sessionId;
try {
  sessionId = localStorage.getItem(SESSION_KEY);
} catch {
  /* Storage may be disabled. */
}
if (!sessionId || !/^[a-zA-Z0-9-]{16,80}$/.test(sessionId)) {
  sessionId = crypto.randomUUID();
  try {
    localStorage.setItem(SESSION_KEY, sessionId);
  } catch {
    /* Keep an in-memory session for this page. */
  }
}
export class ApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}
export async function request(path, body, { signal } = {}) {
  const response = await fetch(`/api${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      'X-Session-Id': sessionId,
      ...(body !== undefined && { 'Content-Type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  });
  const data = await response.json().catch(() => null);
  if (!response.ok)
    throw new ApiError(
      data?.message || `Request failed (${response.status}).`,
      response.status,
      data?.code,
    );
  if (!data) throw new ApiError('The server returned an invalid response.', response.status);
  return data;
}
export const gameApi = {
  current: (options) => request('/games/current', undefined, options),
  create: (mode, revision) =>
    request('/games', { mode, ...(revision !== undefined && { expectedRevision: revision }) }),
  move: (game, cellIndex) =>
    request(`/games/${game.id}/moves`, {
      player: game.currentPlayer,
      cellIndex,
      expectedRevision: game.revision,
    }),
  undo: (game) => request(`/games/${game.id}/undo`, { expectedRevision: game.revision }),
  reset: (game) => request(`/games/${game.id}/reset`, { expectedRevision: game.revision }),
  resetScores: (game) => request('/scoreboard/reset', { expectedRevision: game.revision }),
};
