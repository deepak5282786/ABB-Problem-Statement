import { useGame } from './hooks/useGame.js';
import { GamePanel } from './components/GamePanel.jsx';
import { Scoreboard } from './components/Scoreboard.jsx';
import { MoveHistory } from './components/MoveHistory.jsx';

export default function App() {
  const controller = useGame();
  const { game, busy, error, retry, resetScores } = controller;
  return (
    <div className="shell">
      <header>
        <a className="brand" href="/" aria-label="Cross and Circle home">
          <span className="brand-icon" aria-hidden="true">
            ×<span>○</span>
          </span>{' '}
          cross & circle<span className="brand-dot">.</span>
        </a>
        <span className="header-tag">A LITTLE FRIENDLY COMPETITION</span>
      </header>
      <main>
        <div className="intro">
          <div>
            <p className="eyebrow">THE CLASSIC, REPLAYED</p>
            <h1>
              Good moves.
              <br />
              <span>Great company.</span>
            </h1>
            <p className="subtitle">Three in a row. One more round. You know the drill.</p>
          </div>
          <div className="intro-art" aria-hidden="true">
            ✳
          </div>
        </div>
        {error && (
          <div className="error" role="alert">
            {error}
            <button type="button" disabled={busy} onClick={retry}>
              Retry
            </button>
          </div>
        )}
        <div className="layout">
          <GamePanel {...controller} />
          <aside>
            <Scoreboard game={game} busy={busy} onReset={resetScores} />
            <MoveHistory moves={game?.moves} />
            <div className="tip">
              <span aria-hidden="true">✧</span>
              <p>
                <strong>A little tip</strong>Take the center. Watch the corners.
                <br />
                And never underestimate your opponent.
              </p>
            </div>
          </aside>
        </div>
      </main>
      <footer>
        <span>MADE FOR THE LOVE OF THE GAME</span>
        <span>
          × <span className="footer-circle">○</span> &nbsp; Keep it playful.
        </span>
      </footer>
    </div>
  );
}
