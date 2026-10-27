import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { migrateLegacySessions } from './src/migrate.js';

dotenv.config({ path: new URL('.env', import.meta.url) });
const baseUrl = process.env.API_URL || 'http://127.0.0.1:3001/api';
const sessionId = crypto.randomUUID();
let checks = 0;
const scores = (value) => ({ xWins: value.xWins, oWins: value.oWins, draws: value.draws });
async function request(path, body, expected = 200, session = sessionId, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(session && { 'X-Session-Id': session }),
      ...options.headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json();
  assert.equal(response.status, expected, JSON.stringify(data));
  if (response.ok) assert.equal(response.headers.get('cache-control'), 'no-store');
  checks++;
  console.log(`PASS ${response.status} ${body === undefined ? 'GET' : 'POST'} ${path}`);
  return data;
}
async function play(game, cells) {
  for (const cellIndex of cells)
    game = await request(`/games/${game.id}/moves`, {
      player: game.currentPlayer,
      cellIndex,
      expectedRevision: game.revision,
    });
  return game;
}
async function reset(game) {
  const next = await request(`/games/${game.id}/reset`, { expectedRevision: game.revision });
  assert.notEqual(next.id, game.id);
  assert.equal(next.mode, game.mode);
  assert.equal(next.currentPlayer, 'X');
  assert.equal(next.moves.length, 0);
  assert.ok(next.board.every((cell) => cell === null));
  assert.equal(next.winner, null);
  assert.deepEqual(next.winningCells, []);
  assert.deepEqual(next.scoreboard, game.scoreboard);
  await request(`/games/${game.id}`, undefined, 404);
  return next;
}

await request('/scoreboard', undefined, 400, null);
await request('/games/current', undefined, 404);
await request('/games', { mode: 'bad' }, 400);
await request('/games', [], 400);
await request('/games', { mode: 'two-player' }, 415, sessionId, {
  headers: { 'Content-Type': 'text/plain' },
});
const malformed = await fetch(`${baseUrl}/games`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-Session-Id': sessionId },
  body: '{invalid',
});
assert.equal(malformed.status, 400);
assert.match((await malformed.json()).message, /invalid JSON/);
checks++;
const oversized = await fetch(`${baseUrl}/games`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-Session-Id': sessionId },
  body: JSON.stringify({ value: 'x'.repeat(11000) }),
});
assert.equal(oversized.status, 413);
checks++;
let game = await request('/games', { mode: 'two-player' }, 201);
assert.equal(game.currentPlayer, 'X');
assert.equal(game.revision, 0);
assert.equal(game.board.filter(Boolean).length, 0);
assert.deepEqual(await request(`/games/${game.id}`), game);
assert.deepEqual(await request('/games/current'), game);
await request('/games/not-an-id', undefined, 404);
await request('/unknown-endpoint', undefined, 404);
await request(`/games/${game.id}/undo`, {}, 409);
await request(`/games/${game.id}/moves`, { player: 'O', cellIndex: 0 }, 409);
await request(`/games/${game.id}/moves`, { player: 'Z', cellIndex: 0 }, 400);
for (const cellIndex of [-1, 9, 1.5, '0', null])
  await request(`/games/${game.id}/moves`, { player: 'X', cellIndex }, 400);
await request(`/games/${game.id}/moves`, { player: 'X', cellIndex: 0, expectedRevision: -1 }, 400);
game = await play(game, [0]);
assert.equal(game.currentPlayer, 'O');
assert.equal(game.moves.length, 1);
assert.deepEqual(game.moves[0], { number: 1, player: 'X', cellIndex: 0, row: 1, column: 1 });
await request(`/games/${game.id}/moves`, { player: 'O', cellIndex: 0 }, 409);
assert.deepEqual(await request(`/games/${game.id}`), game);
game = await play(game, [4]);
game = await request(`/games/${game.id}/undo`, { expectedRevision: game.revision });
assert.equal(game.board[4], null);
assert.equal(game.currentPlayer, 'O');
assert.equal(game.moves.length, 1);
game = await play(game, [3, 1, 4, 2]);
assert.equal(game.status, 'Won');
assert.deepEqual(game.winningCells, [0, 1, 2]);
assert.equal(game.scoreboard.xWins, 1);
await request(`/games/${game.id}/moves`, { player: 'O', cellIndex: 5 }, 409);
await request(`/games/${game.id}/undo`, {}, 409);
assert.equal((await request('/scoreboard')).xWins, 1);
await request(`/games/${game.id}`, undefined, 404, crypto.randomUUID());
game = await reset(game);
for (const [cells, line] of [
  [
    [0, 1, 3, 2, 6],
    [0, 3, 6],
  ],
  [
    [0, 1, 4, 2, 8],
    [0, 4, 8],
  ],
  [
    [2, 0, 4, 1, 6],
    [2, 4, 6],
  ],
]) {
  game = await play(game, cells);
  assert.deepEqual(game.winningCells, line);
  game = await reset(game);
}
game = await play(game, [0, 1, 2, 4, 3, 5, 7, 6, 8]);
assert.equal(game.status, 'Draw');
assert.equal(game.winner, null);
assert.equal(game.scoreboard.draws, 1);
await request(`/games/${game.id}/moves`, { player: 'O', cellIndex: 0 }, 409);
game = await reset(game);
game = await play(game, [0, 3, 1, 4, 8, 5]);
assert.equal(game.winner, 'O');
assert.deepEqual(game.scoreboard, { xWins: 4, oWins: 1, draws: 1 });
const cleared = await request('/scoreboard/reset', { expectedRevision: game.revision });
assert.deepEqual(scores(cleared), { xWins: 0, oWins: 0, draws: 0 });
assert.deepEqual(scores(await request('/scoreboard')), scores(cleared));
let current = await request(`/games/${game.id}`);
assert.equal(current.status, 'Won');
assert.deepEqual(current.board, game.board);
assert.deepEqual(current.moves, game.moves);
assert.equal(current.revision, cleared.revision);
game = await reset(current);
const parallel = await Promise.all(
  [0, 1].map((cellIndex) =>
    fetch(`${baseUrl}/games/${game.id}/moves`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Session-Id': sessionId },
      body: JSON.stringify({ player: 'X', cellIndex, expectedRevision: game.revision }),
    }),
  ),
);
assert.deepEqual(parallel.map((response) => response.status).sort(), [200, 409]);
console.log('PASS concurrent moves: exactly one accepted');
game = await request('/games/current');
assert.equal(game.moves.length, 1);
game = await request('/games', { mode: 'computer', expectedRevision: game.revision }, 201);
const oldRevision = game.revision;
game = await play(game, [0]);
assert.equal(game.board[4], 'O');
assert.equal(game.moves.length, 2);
assert.equal(game.currentPlayer, 'X');
const stale = await request(
  `/games/${game.id}/moves`,
  { player: 'X', cellIndex: 1, expectedRevision: oldRevision },
  409,
);
assert.equal(stale.code, 'STALE_STATE');
assert.equal((await request('/games/current')).moves.length, 2);
game = await play(game, [1]);
assert.equal(game.board[2], 'O');
game = await play(game, [3]);
assert.equal(game.board[6], 'O');
assert.equal(game.winner, 'O');
game = await reset(game);
game = await play(game, [0]);
game = await request(`/games/${game.id}/undo`, { expectedRevision: game.revision });
assert.equal(game.moves.length, 0);
assert.equal(game.currentPlayer, 'X');
assert.ok(game.board.every((cell) => cell === null));
// Competing operations use the same revision; only one may commit.
const competing = await Promise.all([
  fetch(`${baseUrl}/games/${game.id}/moves`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Session-Id': sessionId },
    body: JSON.stringify({ player: 'X', cellIndex: 0, expectedRevision: game.revision }),
  }),
  fetch(`${baseUrl}/scoreboard/reset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Session-Id': sessionId },
    body: JSON.stringify({ expectedRevision: game.revision }),
  }),
]);
assert.deepEqual(competing.map((response) => response.status).sort(), [200, 409]);
console.log('PASS concurrent move/score reset: one atomic revision wins');
game = await request('/games/current');
// Two different winning moves race: exactly one result is recorded.
const raceSession = crypto.randomUUID();
let race = await request('/games', { mode: 'two-player' }, 201, raceSession);
for (const cellIndex of [0, 3, 1, 6, 4, 8])
  race = await request(
    `/games/${race.id}/moves`,
    { player: race.currentPlayer, cellIndex, expectedRevision: race.revision },
    200,
    raceSession,
  );
const finishing = await Promise.all(
  [2, 7].map((cellIndex) =>
    fetch(`${baseUrl}/games/${race.id}/moves`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Session-Id': raceSession },
      body: JSON.stringify({ player: 'X', cellIndex, expectedRevision: race.revision }),
    }),
  ),
);
assert.deepEqual(finishing.map((response) => response.status).sort(), [200, 409]);
const raceScore = await request('/scoreboard', undefined, 200, raceSession);
assert.equal(raceScore.xWins, 1);
console.log('PASS simultaneous winning moves count exactly one result');
await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/tic_tac_toe', {
  serverSelectionTimeoutMS: 5000,
});
try {
  const database = mongoose.connection.db;
  const saved = await database.collection('sessions').findOne({ _id: sessionId });
  const { scoreboard, revision, ...state } = game;
  assert.deepEqual(saved.game, state);
  assert.deepEqual(saved.scoreboard, scoreboard);
  assert.equal(saved.revision, revision);
  console.log('PASS MongoDB atomic session document matches game, history, score, and revision');
  const legacySession = crypto.randomUUID();
  const legacyId = new mongoose.Types.ObjectId();
  const { id, ...legacyState } = state;
  assert.ok(id);
  await database.collection('games').insertOne({
    _id: legacyId,
    sessionId: legacySession,
    state: legacyState,
    updatedAt: new Date(),
  });
  await database
    .collection('scores')
    .insertOne({ _id: legacySession, xWins: 7, oWins: 3, draws: 2 });
  await migrateLegacySessions();
  const migrated = await database.collection('sessions').findOne({ _id: legacySession });
  assert.equal(migrated.game.id, legacyId.toString());
  assert.equal(migrated.scoreboard.xWins, 7);
  await database
    .collection('sessions')
    .updateOne({ _id: legacySession }, { $set: { 'scoreboard.xWins': 8 } });
  await migrateLegacySessions();
  assert.equal(
    (await database.collection('sessions').findOne({ _id: legacySession })).scoreboard.xWins,
    8,
  );
  assert.ok(await database.collection('games').findOne({ _id: legacyId }));
  console.log(
    'PASS legacy migration preserves game/scores and never overwrites a migrated session',
  );
} finally {
  await mongoose.disconnect();
}
console.log(
  `API verification passed: ${checks} HTTP checks, three concurrency checks, persistence and migration. Session: ${sessionId}`,
);
