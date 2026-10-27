import mongoose from 'mongoose';
import { Session } from '../models/session.js';
import { createGame, move, undo, resultKey, GameError } from '../game.js';

export const emptyScoreboard = () => ({ xWins: 0, oWins: 0, draws: 0 });

function checkRevision(session, expectedRevision) {
  if (expectedRevision !== undefined && expectedRevision !== (session.revision ?? 0)) {
    throw new GameError(
      'The game changed in another request. Refresh and try again.',
      409,
      'STALE_STATE',
    );
  }
}
async function persist(session) {
  try {
    await session.save();
  } catch (error) {
    if (error instanceof mongoose.Error.VersionError || error.code === 11000) {
      throw new GameError(
        'The game changed in another request. Refresh and try again.',
        409,
        'STALE_STATE',
      );
    }
    throw error;
  }
  return session;
}
async function save(session) {
  return snapshot(await persist(session));
}
function snapshot(session) {
  return {
    ...session.game.toObject(),
    scoreboard: session.scoreboard.toObject(),
    revision: session.revision,
  };
}
async function findGame(sessionId, gameId) {
  const session = await Session.findById(sessionId);
  if (!session?.game || (gameId !== 'current' && session.game.id !== gameId)) {
    throw new GameError('Game not found.', 404);
  }
  return session;
}

export async function startGame(sessionId, mode, expectedRevision) {
  const game = { ...createGame(mode), id: new mongoose.Types.ObjectId().toString() };
  const session = (await Session.findById(sessionId)) || new Session({ _id: sessionId });
  checkRevision(session, expectedRevision);
  session.game = game;
  return save(session);
}
export async function getGame(sessionId, gameId) {
  return snapshot(await findGame(sessionId, gameId));
}
export async function submitMove(sessionId, gameId, { player, cellIndex, expectedRevision }) {
  const session = await findGame(sessionId, gameId);
  checkRevision(session, expectedRevision);
  const next = move(session.game.toObject(), player, cellIndex);
  session.game = next;
  if (next.status !== 'InProgress') session.scoreboard[resultKey(next)] += 1;
  return save(session);
}
export async function undoMove(sessionId, gameId, expectedRevision) {
  const session = await findGame(sessionId, gameId);
  checkRevision(session, expectedRevision);
  session.game = undo(session.game.toObject());
  return save(session);
}
export async function resetGame(sessionId, gameId, expectedRevision) {
  const session = await findGame(sessionId, gameId);
  checkRevision(session, expectedRevision);
  session.game = { ...createGame(session.game.mode), id: new mongoose.Types.ObjectId().toString() };
  return save(session);
}
export async function getScoreboard(sessionId) {
  const session = await Session.findById(sessionId).select('scoreboard revision').lean();
  return { ...(session?.scoreboard || emptyScoreboard()), revision: session?.revision ?? 0 };
}
export async function resetScoreboard(sessionId, expectedRevision) {
  const session = (await Session.findById(sessionId)) || new Session({ _id: sessionId });
  checkRevision(session, expectedRevision);
  session.scoreboard = emptyScoreboard();
  await persist(session);
  return { ...session.scoreboard.toObject(), revision: session.revision };
}
