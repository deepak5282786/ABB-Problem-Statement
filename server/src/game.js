export const LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];
export class GameError extends Error {
  constructor(message, status = 400, code) {
    super(message);
    this.name = 'GameError';
    this.status = status;
    this.code = code;
  }
}
export function createGame(mode = 'two-player') {
  if (!['two-player', 'computer'].includes(mode)) throw new GameError('Choose a valid game mode.');
  return {
    mode,
    board: Array(9).fill(null),
    currentPlayer: 'X',
    status: 'InProgress',
    winner: null,
    winningCells: [],
    moves: [],
  };
}
function evaluate(game) {
  const line = LINES.find(
    ([a, b, c]) =>
      game.board[a] && game.board[a] === game.board[b] && game.board[a] === game.board[c],
  );
  game.winner = line ? game.board[line[0]] : null;
  game.winningCells = line || [];
  game.status = line ? 'Won' : game.board.every(Boolean) ? 'Draw' : 'InProgress';
  game.currentPlayer = game.moves.length % 2 === 0 ? 'X' : 'O';
}
function put(game, cellIndex) {
  const player = game.currentPlayer;
  game.board[cellIndex] = player;
  game.moves.push({
    number: game.moves.length + 1,
    player,
    cellIndex,
    row: Math.floor(cellIndex / 3) + 1,
    column: (cellIndex % 3) + 1,
  });
  evaluate(game);
}
export function computerMove(board) {
  for (const player of ['O', 'X']) {
    for (const line of LINES) {
      const empty = line.filter((i) => !board[i]);
      if (empty.length === 1 && line.filter((i) => board[i] === player).length === 2)
        return empty[0];
    }
  }
  return [4, 0, 2, 6, 8, 1, 3, 5, 7].find((i) => !board[i]);
}
export function move(game, player, cellIndex) {
  if (game.status !== 'InProgress')
    throw new GameError('This game is complete. Start a new round.', 409);
  if (!Number.isInteger(cellIndex) || cellIndex < 0 || cellIndex > 8)
    throw new GameError('Cell index must be an integer from 0 to 8.');
  if (!['X', 'O'].includes(player)) throw new GameError('Player must be X or O.');
  if (player !== game.currentPlayer || (game.mode === 'computer' && player !== 'X'))
    throw new GameError('It is not this player’s turn.', 409);
  if (game.board[cellIndex]) throw new GameError('This cell is already occupied.', 409);
  const next = structuredClone(game);
  put(next, cellIndex);
  if (next.mode === 'computer' && next.status === 'InProgress') put(next, computerMove(next.board));
  return next;
}
export function undo(game) {
  if (game.status !== 'InProgress')
    throw new GameError('Undo is disabled after a completed game.', 409);
  if (!game.moves.length) throw new GameError('There are no moves to undo.', 409);
  const next = structuredClone(game);
  const removed = next.moves.splice(-Math.min(next.mode === 'computer' ? 2 : 1, next.moves.length));
  removed.forEach((m) => {
    next.board[m.cellIndex] = null;
  });
  evaluate(next);
  return next;
}
export function resultKey(game) {
  if (game.status === 'InProgress') throw new GameError('An unfinished game has no result.');
  return game.status === 'Draw' ? 'draws' : game.winner === 'X' ? 'xWins' : 'oWins';
}
