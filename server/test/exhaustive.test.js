import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, move, undo, LINES } from '../src/game.js';

test('every reachable two-player board obeys turn, result, undo and history invariants', () => {
  const visited = new Set();
  function visit(game) {
    const key = game.board.map((cell) => cell || '-').join('');
    if (visited.has(key)) return;
    visited.add(key);
    assert.equal(game.moves.length, game.board.filter(Boolean).length);
    assert.equal(game.currentPlayer, game.moves.length % 2 ? 'O' : 'X');
    const winning = LINES.some(
      ([a, b, c]) =>
        game.board[a] && game.board[a] === game.board[b] && game.board[a] === game.board[c],
    );
    assert.equal(game.status === 'Won', winning);
    if (game.status !== 'InProgress') {
      assert.throws(() => move(game, game.currentPlayer, 0));
      return;
    }
    game.board.forEach((cell, index) => {
      if (cell) return;
      const next = move(game, game.currentPlayer, index);
      if (next.status === 'InProgress') assert.deepEqual(undo(next), game);
      visit(next);
    });
  }
  visit(createGame());
  assert.equal(visited.size, 5478);
});

test('every human continuation in computer mode returns a valid reply or terminal state', () => {
  function visit(game) {
    if (game.status !== 'InProgress') return;
    game.board.forEach((cell, index) => {
      if (cell) return;
      const next = move(game, 'X', index);
      assert.equal(next.board[index], 'X');
      assert.ok(
        next.moves.length - game.moves.length >= 1 && next.moves.length - game.moves.length <= 2,
      );
      if (next.status === 'InProgress') {
        assert.equal(next.currentPlayer, 'X');
        assert.deepEqual(undo(next), game);
        visit(next);
      } else assert.throws(() => move(next, 'X', 0));
    });
  }
  visit(createGame('computer'));
});
