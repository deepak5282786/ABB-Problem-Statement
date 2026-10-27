import { useCallback, useEffect, useRef, useState } from 'react';
import { gameApi } from '../lib/api.js';

export function useGame() {
  const [game, setGame] = useState(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const inFlight = useRef(false);
  const mounted = useRef(false);

  const run = useCallback(async (action) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError('');
    try {
      const next = await action();
      if (mounted.current) setGame(next);
    } catch (failure) {
      if (!mounted.current || failure.name === 'AbortError') return;
      if (failure.code === 'STALE_STATE' || failure.status === 404) {
        try {
          const latest = await gameApi.current();
          if (mounted.current) setGame(latest);
        } catch {
          /* Keep the error visible if recovery fails. */
        }
      }
      if (mounted.current)
        setError(
          failure instanceof TypeError
            ? 'Cannot reach the server. Check that the API is running, then retry.'
            : failure.message,
        );
    } finally {
      inFlight.current = false;
      if (mounted.current) setBusy(false);
    }
  }, []);
  const load = useCallback(
    () =>
      run(async () => {
        try {
          return await gameApi.current();
        } catch (failure) {
          if (failure.status !== 404) throw failure;
          return gameApi.create('two-player');
        }
      }),
    [run],
  );

  useEffect(() => {
    mounted.current = true;
    load();
    return () => {
      mounted.current = false;
    };
  }, [load]);

  return {
    game,
    busy,
    error,
    retry: load,
    newGame: (mode) => run(() => gameApi.create(mode, game?.revision)),
    play: (cellIndex) => run(() => gameApi.move(game, cellIndex)),
    undo: () => run(() => gameApi.undo(game)),
    reset: () => run(() => gameApi.reset(game)),
    resetScores: () =>
      run(async () => {
        const { revision, ...scoreboard } = await gameApi.resetScores(game);
        return { ...game, revision, scoreboard };
      }),
  };
}
