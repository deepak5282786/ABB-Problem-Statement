const CELLS = Array.from({ length: 9 }, (_, index) => index);

export function GameBoard({ game, busy, onPlay }) {
  const complete = game?.status !== 'InProgress';
  return (
    <div className="board" aria-label="Tic Tac Toe board" aria-busy={busy}>
      {CELLS.map((index) => {
        const player = game?.board[index];
        const winning = game?.winningCells.includes(index);
        return (
          <button
            key={index}
            type="button"
            aria-label={`Row ${Math.floor(index / 3) + 1}, column ${(index % 3) + 1}: ${player || 'empty'}${winning ? ', winning cell' : ''}`}
            disabled={!game || busy || complete || Boolean(player)}
            className={`cell ${player === 'X' ? 'cross' : 'circle'} ${winning ? 'winning' : ''}`}
            onClick={() => onPlay(index)}
          >
            {player === 'X' ? '×' : player === 'O' ? '○' : <span className="cell-dot" />}
          </button>
        );
      })}
    </div>
  );
}
