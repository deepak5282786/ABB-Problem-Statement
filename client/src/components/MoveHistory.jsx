export function MoveHistory({ moves = [] }) {
  return (
    <section className="history-panel" aria-label="Move history">
      <div className="aside-heading">
        <h2>Move by move</h2>
        <span className="count">{moves.length} / 9</span>
      </div>
      <p className="muted">The story of this round.</p>
      <div className="history" aria-live="polite">
        {moves.length ? (
          <ol>
            {moves.map((move) => (
              <li key={move.number}>
                <span className="move-number">{String(move.number).padStart(2, '0')}</span>
                <span
                  aria-hidden="true"
                  className={`move-mark ${move.player === 'X' ? 'cross' : 'circle'}`}
                >
                  {move.player === 'X' ? '×' : '○'}
                </span>
                <span>
                  Player {move.player}
                  <small>
                    Row {move.row}, Column {move.column}
                  </small>
                </span>
                <span className="move-position">
                  {['A', 'B', 'C'][move.column - 1]}
                  {move.row}
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <div className="empty">
            <span aria-hidden="true">⌁</span>
            <strong>A clean slate.</strong>
            <p>
              Make your first move.
              <br />
              We’ll keep track from here.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
