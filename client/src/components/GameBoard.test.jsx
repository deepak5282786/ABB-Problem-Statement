import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { GameBoard } from './GameBoard.jsx';
import { MoveHistory } from './MoveHistory.jsx';
import { Scoreboard } from './Scoreboard.jsx';

afterEach(cleanup);
const initial = () => ({
  board: Array(9).fill(null),
  winningCells: [],
  status: 'InProgress',
  mode: 'two-player',
  moves: [],
  scoreboard: { xWins: 2, oWins: 1, draws: 3 },
});

test('renders nine accessible cells and submits only the clicked index', () => {
  const onPlay = vi.fn();
  render(<GameBoard game={initial()} busy={false} onPlay={onPlay} />);
  expect(screen.getAllByRole('button')).toHaveLength(9);
  fireEvent.click(screen.getByRole('button', { name: 'Row 2, column 2: empty' }));
  expect(onPlay).toHaveBeenCalledWith(4);
});
test('occupied cells and pending requests prevent submissions', () => {
  const game = initial();
  game.board[0] = 'X';
  const onPlay = vi.fn();
  const { rerender } = render(<GameBoard game={game} busy={false} onPlay={onPlay} />);
  fireEvent.click(screen.getByRole('button', { name: 'Row 1, column 1: X' }));
  expect(onPlay).not.toHaveBeenCalled();
  rerender(<GameBoard game={game} busy onPlay={onPlay} />);
  expect(screen.getAllByRole('button').every((button) => button.disabled)).toBe(true);
});
test.each(['Won', 'Draw'])('a %s game locks the board', (status) => {
  render(<GameBoard game={{ ...initial(), status }} busy={false} onPlay={vi.fn()} />);
  expect(screen.getAllByRole('button').every((button) => button.disabled)).toBe(true);
});
test('winning cells have accessible descriptions and highlight class', () => {
  const game = {
    ...initial(),
    board: ['X', 'X', 'X', null, null, null, null, null, null],
    winningCells: [0, 1, 2],
    status: 'Won',
  };
  render(<GameBoard game={game} busy={false} onPlay={vi.fn()} />);
  const cells = screen.getAllByRole('button', { name: /winning cell/ });
  expect(cells).toHaveLength(3);
  expect(cells.every((cell) => cell.classList.contains('winning'))).toBe(true);
});
test('move history displays move number, player and one-based position', () => {
  render(<MoveHistory moves={[{ number: 1, player: 'X', cellIndex: 4, row: 2, column: 2 }]} />);
  expect(screen.getByText('01')).toBeTruthy();
  expect(screen.getByText('Player X')).toBeTruthy();
  expect(screen.getByText('Row 2, Column 2')).toBeTruthy();
});
test('scoreboard uses backend totals and invokes separate reset action', () => {
  const onReset = vi.fn();
  render(<Scoreboard game={initial()} busy={false} onReset={onReset} />);
  for (const score of ['2', '1', '3']) expect(screen.getByText(score)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: /Reset scores/ }));
  expect(onReset).toHaveBeenCalledOnce();
});
