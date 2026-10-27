import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { useGame } from './useGame.js';
import { gameApi } from '../lib/api.js';

vi.mock('../lib/api.js', () => ({
  gameApi: {
    current: vi.fn(),
    create: vi.fn(),
    move: vi.fn(),
    undo: vi.fn(),
    reset: vi.fn(),
    resetScores: vi.fn(),
  },
}));
const initial = () => ({
  id: 'game-id',
  revision: 0,
  currentPlayer: 'X',
  board: Array(9).fill(null),
  scoreboard: { xWins: 1, oWins: 0, draws: 0 },
});
beforeEach(() => {
  vi.resetAllMocks();
  gameApi.current.mockResolvedValue(initial());
});
afterEach(cleanup);
async function setup() {
  const hook = renderHook(useGame);
  await waitFor(() => expect(hook.result.current.busy).toBe(false));
  return hook;
}

test('restores the backend game and creates one only when missing', async () => {
  gameApi.current.mockRejectedValueOnce({ status: 404 });
  gameApi.create.mockResolvedValue(initial());
  const { result } = await setup();
  expect(gameApi.create).toHaveBeenCalledWith('two-player');
  expect(result.current.game.id).toBe('game-id');
});
test('synchronous lock prevents double-click submissions before React rerenders', async () => {
  let resolve;
  gameApi.move.mockImplementation(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  const { result } = await setup();
  act(() => {
    result.current.play(0);
    result.current.play(1);
  });
  expect(gameApi.move).toHaveBeenCalledOnce();
  await act(async () => resolve({ ...initial(), revision: 1 }));
  expect(result.current.game.revision).toBe(1);
});
test('stale requests load the current state and show a recovery message', async () => {
  const { result } = await setup();
  gameApi.move.mockRejectedValue({ code: 'STALE_STATE', message: 'Game changed.' });
  gameApi.current.mockResolvedValue({ ...initial(), revision: 2 });
  await act(async () => result.current.play(0));
  expect(result.current.game.revision).toBe(2);
  expect(result.current.error).toBe('Game changed.');
});
test('score reset updates revision and scores while keeping the board', async () => {
  const { result } = await setup();
  gameApi.resetScores.mockResolvedValue({ xWins: 0, oWins: 0, draws: 0, revision: 1 });
  await act(async () => result.current.resetScores());
  expect(result.current.game.scoreboard.xWins).toBe(0);
  expect(result.current.game.revision).toBe(1);
  expect(result.current.game.board).toEqual(initial().board);
});
test('network failures show an error and retry recovers', async () => {
  gameApi.current.mockRejectedValueOnce(new TypeError('Failed to fetch'));
  const { result } = await setup();
  expect(result.current.error).toContain('Cannot reach');
  await act(async () => result.current.retry());
  expect(result.current.error).toBe('');
  expect(result.current.game.id).toBe('game-id');
});
