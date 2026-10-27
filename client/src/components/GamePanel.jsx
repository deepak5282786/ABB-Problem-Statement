import { GameBoard } from './GameBoard.jsx';
const MODES = [
  ['two-player', 'Two players', '♧'],
  ['computer', 'Vs. computer', '▣'],
];

function statusTitle(game, busy) {
  if (!game) return busy ? 'Loading your game…' : 'Let’s get you playing';
  if (game.status === 'Draw') return 'A well-matched draw.';
  if (game.status === 'Won')
    return `${game.winner === 'O' && game.mode === 'computer' ? 'Computer' : `Player ${game.winner}`} wins!`;
  return `Player ${game.currentPlayer}, your move.`;
}
export function GamePanel({ game, busy, newGame, play, undo, reset }) {
  const complete = game && game.status !== 'InProgress';
  return (
    <section className="play-panel" aria-label="Game">
      <div className="panel-top">
        <span className="section-label">LET’S PLAY</span>
        <span className="round-label">
          <span className="live-dot" />
          {!game ? 'Getting ready' : complete ? 'Round complete' : 'Game on'}
        </span>
      </div>
      <div className="mode-switch" role="group" aria-label="Game mode">
        {MODES.map(([mode, label, icon]) => (
          <button
            key={mode}
            type="button"
            disabled={busy}
            aria-pressed={game?.mode === mode}
            className={game?.mode === mode ? 'selected' : ''}
            onClick={() => {
              if (game?.mode !== mode) newGame(mode);
            }}
          >
            <span aria-hidden="true">{icon}</span> {label}
          </button>
        ))}
      </div>
      <div className="status" role="status">
        <h2>{statusTitle(game, busy)}</h2>
        <p>
          {complete
            ? 'Ready for a rematch? Start a fresh round below.'
            : game?.mode === 'computer'
              ? 'You’re X. The computer plays O.'
              : 'Pass the turn. Make your mark.'}
        </p>
      </div>
      <GameBoard game={game} busy={busy} onPlay={play} />
      <div className="game-actions">
        <button
          type="button"
          className="secondary"
          disabled={busy || !game?.moves.length || complete}
          onClick={undo}
        >
          <span aria-hidden="true">↶</span>
          <span>Undo {game?.mode === 'computer' ? 'turn' : 'move'}</span>
        </button>
        <button type="button" className="primary" disabled={busy || !game} onClick={reset}>
          <span aria-hidden="true">↻</span>
          <span>New round</span>
        </button>
      </div>
      <p className="board-note">
        {complete
          ? 'Completed scores are final. Undo is disabled.'
          : game?.mode === 'computer'
            ? 'Undo takes back your move and the computer’s reply.'
            : 'A small game. An infinite number of rematches.'}
      </p>
    </section>
  );
}
