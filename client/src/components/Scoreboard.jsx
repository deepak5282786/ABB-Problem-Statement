const EMPTY_SCORE = { xWins: 0, oWins: 0, draws: 0 };
export function Scoreboard({ game, busy, onReset }) {
  const score = game?.scoreboard || EMPTY_SCORE;
  const entries = [
    ['score-x', '×', score.xWins, 'PLAYER X'],
    ['score-draw', '=', score.draws, 'DRAWS'],
    ['score-o', '○', score.oWins, game?.mode === 'computer' ? 'COMPUTER / O' : 'PLAYER O'],
  ];
  return (
    <section className="score-panel" aria-label="Scoreboard">
      <div className="aside-heading">
        <h2>The scoreboard</h2>
        <span aria-hidden="true">↗</span>
      </div>
      <p className="muted">Your session, by the numbers.</p>
      <div className="scores" aria-live="polite">
        {entries.map(([style, mark, total, label]) => (
          <div key={style} className={style}>
            <span aria-hidden="true">{mark}</span>
            <strong>{total}</strong>
            <small>{label}</small>
          </div>
        ))}
      </div>
      <div className="score-footer">
        <span>Every round counts.</span>
        <button type="button" disabled={busy || !game} onClick={onReset}>
          Reset scores ↺
        </button>
      </div>
    </section>
  );
}
