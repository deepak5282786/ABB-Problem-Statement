import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, move, undo, computerMove, resultKey } from '../src/game.js';
const play = (cells) => cells.reduce((g, c) => move(g, g.currentPlayer, c), createGame());
test('valid moves switch turns without mutating previous state', () => {
  const g = createGame();
  const n = move(g, 'X', 0);
  assert.equal(n.board[0], 'X');
  assert.equal(n.currentPlayer, 'O');
  assert.equal(g.board[0], null);
  assert.deepEqual(n.moves[0], { number: 1, player: 'X', cellIndex: 0, row: 1, column: 1 });
});
test('rejects invalid modes, positions, players and occupied cells', () => {
  assert.throws(() => createGame('bad'));
  for (const index of [-1, 9, 1.2, '0', null]) assert.throws(() => move(createGame(), 'X', index));
  assert.throws(() => move(createGame(), 'O', 0));
  const g = play([0]);
  assert.throws(() => move(g, 'O', 0));
  assert.equal(g.currentPlayer, 'O');
});
for (const [name, cells, line] of [
  ['row', [0, 3, 1, 4, 2], [0, 1, 2]],
  ['column', [0, 1, 3, 2, 6], [0, 3, 6]],
  ['diagonal', [0, 1, 4, 2, 8], [0, 4, 8]],
  ['other diagonal', [2, 0, 4, 1, 6], [2, 4, 6]],
])
  test(`${name} win`, () => {
    const g = play(cells);
    assert.equal(g.winner, 'X');
    assert.equal(g.status, 'Won');
    assert.deepEqual(g.winningCells, line);
    assert.equal(resultKey(g), 'xWins');
  });
test('O can win', () => {
  const g = play([0, 3, 1, 4, 8, 5]);
  assert.equal(g.winner, 'O');
  assert.equal(resultKey(g), 'oWins');
});
test('draw', () => {
  const g = play([0, 1, 2, 4, 3, 5, 7, 6, 8]);
  assert.equal(g.status, 'Draw');
  assert.equal(g.winner, null);
  assert.equal(resultKey(g), 'draws');
});
test('completed games reject moves and undo', () => {
  const g = play([0, 3, 1, 4, 2]);
  assert.throws(() => move(g, 'O', 5));
  assert.throws(() => undo(g));
});
test('two-player undo removes one move and restores turn', () => {
  const g = undo(play([0, 4]));
  assert.equal(g.moves.length, 1);
  assert.equal(g.board[4], null);
  assert.equal(g.currentPlayer, 'O');
  assert.throws(() => undo(createGame()));
});
test('computer undo removes a move pair', () => {
  const g = move(createGame('computer'), 'X', 0);
  assert.equal(g.moves.length, 2);
  assert.equal(g.board[4], 'O');
  const n = undo(g);
  assert.deepEqual(n, createGame('computer'));
});
test('computer wins before blocking, then center, corners and edges', () => {
  assert.equal(computerMove(['O', 'O', null, 'X', 'X', null, null, null, null]), 2);
  assert.equal(computerMove(['X', 'X', null, null, 'O', null, null, null, null]), 2);
  assert.equal(computerMove(Array(9).fill(null)), 4);
  assert.equal(computerMove([null, null, null, null, 'X', null, null, null, null]), 0);
  assert.equal(computerMove(['X', null, 'O', 'O', 'X', 'X', 'X', null, 'O']), 1);
});
test('computer never plays after human wins', () => {
  const g = {
    ...createGame('computer'),
    board: ['X', 'X', null, 'O', 'O', null, null, null, null],
    moves: [
      { player: 'X', cellIndex: 0 },
      { player: 'O', cellIndex: 3 },
      { player: 'X', cellIndex: 1 },
      { player: 'O', cellIndex: 4 },
    ],
  };
  const n = move(g, 'X', 2);
  assert.equal(n.status, 'Won');
  assert.equal(n.moves.length, 5);
});
test('reset creates an empty board with selected mode', () => {
  const g = createGame('computer');
  assert.equal(g.currentPlayer, 'X');
  assert.equal(g.moves.length, 0);
  assert.ok(g.board.every((c) => c === null));
  assert.equal(g.mode, 'computer');
});
