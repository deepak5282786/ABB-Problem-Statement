# Cross & Circle — Tic Tac Toe

A browser game built with **React 19, Node.js, Express 5, Mongoose, and MongoDB**. The REST API owns game rules, turns, computer moves, move history, results, and scores. The frontend renders its responses.

## 1. Requirements and scope

The application uses **React** for the frontend, **Node.js with Express** for the REST API, and **MongoDB** for persistent storage through Mongoose. Setup, API contracts, test instructions, and design decisions are documented below.

## 2. Run locally

Prerequisites: Node.js **22.12+**, npm, and a running MongoDB instance (local installation or Docker Desktop).

```sh
npm ci
# If MongoDB is not already running locally:
docker compose up -d
# Optional configuration:
cp server/.env.example server/.env
npm run dev
```

Open the Vite URL printed in the terminal, normally http://127.0.0.1:5173. The development server proxies `/api` to http://127.0.0.1:3001. The API binds to the local loopback interface.

Default database: `mongodb://127.0.0.1:27017/tic_tac_toe`. The API always loads `server/.env`, even when started from the repository root. If changing `PORT`, also update the frontend proxy in `client/vite.config.js`.

To run each process in its own terminal:

```sh
npm run dev -w server
npm run dev -w client
```

To serve a production build locally:

```sh
npm run build
npm start
```

Open http://localhost:3001. Rebuild after frontend edits. Do not run both API start commands at once: both use port 3001. Shut down with Ctrl+C.

## 3. Implemented features

- Responsive 3 × 3 board; accessible labels and keyboard-operable buttons.
- X/O turns; occupied cells and completed boards locked; backend validation of every move.
- Row, column, and diagonal win detection, winning-cell highlighting, and draws.
- Two-player mode and human-X/computer-O mode.
- Deterministic computer priority: **win → block → center → corner → any remaining cell**.
- Numbered history with player, row, and column.
- One-move undo in two-player mode; human/computer pair undo in computer mode.
- **Undo clarification A:** completed games are final; undo is disabled after a win or draw.
- Backend session scores for X wins, O wins, and draws, counted exactly once.
- New round clears board/history/result, starts X, creates a **new game ID**, and preserves scores and mode.
- Separate score reset preserves the active board, history, turn, and result; the session revision increases.
- MongoDB persistence across refresh and API restart.
- Double-click protection, request loading/error states, and recovery from stale-tab conflicts.

## 4. Code organization

```text
client/src/
  App.jsx                   Page composition
  components/               Board, game panel, scores, history
  hooks/useGame.js          Request lifecycle and server-state coordination
  lib/api.js                Fetch client, session header, API errors
  styles.css                Responsive visual styles
server/src/
  app.js                    Express setup and REST routes
  game.js                   Pure rules and deterministic computer strategy
  models/session.js         Validated MongoDB session schema
  services/game-service.js  Game operations and persistence
  middleware/validation.js  JSON/session validation and error responses
  migrate.js                Insert-only legacy data migration
  index.js                  Configuration, database startup, graceful shutdown
```

The board is only nine cells; no memoization, state library, or extra game-rule cache is needed. Separate components and pure rules keep the code easy to review. ESLint checks JavaScript/JSX and React hooks; Prettier formats code and documentation.

## 5. Persistence and concurrency decisions

Each MongoDB `sessions` document contains the **active game, scoreboard, and revision**. A completed move and its score update are saved in the same atomic document write. No cross-document transaction or replica set is required. Each document is bounded to one board and at most nine moves, regardless of how many rounds are played.

Mongoose optimistic concurrency compares `revision` in the database. Competing writes to the same revision cannot both commit. Different sessions do not wait on a global application queue. The React client submits `expectedRevision`, preventing a stale computer-mode request from accidentally playing another human turn. A conflict returns HTTP 409 with `code: "STALE_STATE"`; the frontend loads `/api/games/current` and shows the error.

Scores remain after a new round; the previous active board is replaced. Historical completed boards are not exposed as an archive. A previous game ID returns 404 after reset or mode change.

A persistent random `X-Session-Id` in localStorage identifies a session for the current site origin within a browser profile. Tabs on the same origin share it. Different origins, such as localhost:3001 and 127.0.0.1:5173, have separate sessions and scores. It is not authentication. If storage is blocked, an in-memory ID works for the current page, but refreshing cannot restore that session.

At startup, an insert-only migration preserves the latest game and scores from the previous `games`/`scores` schema into `sessions`. It never overwrites an existing migrated session or deletes the original records.

## 6. REST API contract

All API requests require `X-Session-Id` (16–80 alphanumeric/hyphen characters). POST requests require `Content-Type: application/json` and a JSON object. Cell indices are **0–8**; row/column values in history are **1–3**.

| Method | Endpoint                | JSON body                                                  | Success                                   |
| ------ | ----------------------- | ---------------------------------------------------------- | ----------------------------------------- |
| POST   | `/api/games`            | `{ "mode": "two-player" }` or `{ "mode": "computer" }`     | 201, fresh active game                    |
| GET    | `/api/games/current`    | —                                                          | 200, browser session's active game        |
| GET    | `/api/games/:id`        | —                                                          | 200, game state                           |
| POST   | `/api/games/:id/moves`  | `{ "player": "X", "cellIndex": 0, "expectedRevision": 0 }` | 200, game plus computer reply when needed |
| POST   | `/api/games/:id/undo`   | `{ "expectedRevision": 1 }`                                | 200, previous playable state              |
| POST   | `/api/games/:id/reset`  | `{ "expectedRevision": 1 }`                                | 200, cleared game with **new ID**         |
| GET    | `/api/scoreboard`       | —                                                          | 200, totals and revision                  |
| POST   | `/api/scoreboard/reset` | `{ "expectedRevision": 1 }`                                | 200, zero totals and updated revision     |

`expectedRevision` is optional for manual API use; if supplied, it must match the current session revision. The frontend supplies it for moves, undo, reset, score reset, and mode changes once a game has loaded. The initial game creation omits it because no game revision has been loaded yet. New game creation accepts it too. Do not reuse sample revision numbers: copy the revision from the latest response. After reset/mode change, copy the new game ID as well.

Game responses include `id`, `mode`, `board`, `currentPlayer`, `status` (`InProgress`, `Won`, `Draw`), `winner`, `winningCells`, `moves`, `scoreboard`, and `revision`. Each move includes `number`, `player`, `cellIndex`, `row`, `column`. `currentPlayer` is meaningful as a next turn only while InProgress.

Score responses contain `xWins`, `oWins`, `draws`, and `revision`. Errors use `{ "message": "…", "code": "…" }` (code is present for stale-state conflicts). Statuses: 400 invalid input/JSON/session, 404 missing or inactive game, 409 illegal action/stale revision, 413 oversized body, 415 unsupported content type, 500 unexpected failure. Internal errors are not returned to the client. Game and scoreboard responses send `Cache-Control: no-store`.

## 7. Tests and code-quality checks

```sh
npm run check       # lint, formatting, backend + frontend tests, build
npm run test:api    # requires running API and MongoDB
```

Individual commands:

```sh
npm test
npm run lint
npm run format:check
npm run format
npm run build
```

- **16 backend tests:** requested rule cases plus all 5,478 reachable two-player boards and every human continuation in computer mode.
- **12 frontend tests:** board rendering, locking, highlighting, history, scores, initial load, double-click protection, stale-state recovery, score reset, and network retry.
- **100 live HTTP checks**, three concurrency scenarios, direct MongoDB comparisons, and insert-only migration checks. Test sessions and legacy migration fixtures are isolated by UUID; they are left in the local database.
- Browser regression: both modes, undo, all win types, draw, score updates/reset, refresh, and responsive layout. All listed browser checks passed during local verification.

The live script reads `server/.env`. Override `API_URL` if the API is not at `http://127.0.0.1:3001/api`. The test database must match the API database.

### Manual testing

Open the application and use these board positions:

```text
A1  B1  C1
A2  B2  C2
A3  B3  C3
```

Use **Two players** for the turn, undo, win, and draw sequences. Select **Vs. computer** for computer tests. Start a new round before each independent sequence.

| Test              | Actions                                           | Expected result                                 |
| ----------------- | ------------------------------------------------- | ----------------------------------------------- |
| Turns and history | Two players: A1, B2                               | X at A1, O at B2, X turn, two history entries   |
| Invalid move      | Try an occupied cell                              | No move or turn change                          |
| Undo              | Undo after A1, B2                                 | B2 clears; O turn                               |
| Row win           | A1, A2, B1, B2, C1                                | X wins; top row highlighted; X score +1         |
| Column win        | A1, B1, A2, C1, A3                                | X wins; left column highlighted                 |
| Diagonal win      | A1, B1, B2, C1, C3                                | X wins; diagonal highlighted                    |
| Draw              | A1, B1, C1, B2, A2, C2, B3, A3, C3                | Draw; draw score +1; board locked               |
| Final result      | Try moving or undoing after a result              | Both actions blocked; no second score increment |
| Round reset       | New round                                         | Board/history clear; X starts; scores unchanged |
| Score reset       | Reset scores during a round                       | Totals zero; board/history unchanged            |
| Computer          | Vs. computer: A1, then B1, then A2                | O takes center, blocks at C1, then wins at A3   |
| Computer undo     | New round; A1; Undo turn                          | Both marks removed; X turn                      |
| Persistence       | Refresh or restart API, then refresh              | Same active game and scores                     |
| Stale tab         | Open two tabs; move in one; submit from the other | Stale action rejected; latest state loaded      |

To inspect frontend requests, open browser Developer Tools → Network → Fetch/XHR. Check request method, status, JSON payload, and response against the board. The frontend initially calls GET `/api/games/current`; a new session receives 404 followed by POST `/api/games`.

For Postman, use the endpoint table above with base URL `http://localhost:3001/api`, JSON bodies, and a consistent `X-Session-Id` header (for example `manual-session-20261027-01`). Copy each response's new game ID/revision before the next action. Verify wrong player/occupied/completed moves return 409, out-of-range indices return 400, and unknown games return 404. To test the same session as the browser, copy its header from the Network panel.

In MongoDB Compass, connect to `mongodb://127.0.0.1:27017`, open database `tic_tac_toe`, collection `sessions`, and filter by `{ "_id": "YOUR_SESSION_ID" }`. Compare `game`, `scoreboard`, and `revision` with the API response. Old `games`/`scores` collections are preserved legacy copies.

## 8. AI tools and prompt summary

Tool: OpenAI Codex. User prompts asked to (1) implement the supplied assessment with React/Node/Express/MongoDB, (2) manually test and document every operation, and (3) audit each requirement, optimize both codebases, format the code, follow best practices, and reverify all APIs.

AI generated and refactored the application, persistence schema/migration, tests, formatting/lint configuration, and documentation. No candidate-authored manual changes are claimed. Review focused on validation, undo semantics, computer priorities, once-only scoring, atomic saves, concurrent requests, revision recovery, data preservation, and requirement coverage.

## 9. Assumptions and clarifications

- Browser session means a persistent identifier scoped to the site origin and browser profile; there are no named accounts.
- Human always plays X in computer mode. Computer replies within the same backend move operation.
- Reset Game is labeled **New round**; Reset Scoreboard is labeled **Reset scores**.
- Undo is disabled after completion (option A). Score reset does not reopen or recount completed games.
- Reset creates a fresh active game ID. Only the active board and cumulative scores are retained in the new schema.

## 10. Known limitations

- No authentication, online multiplayer, real-time tab synchronization, or session expiration.
- The client resolves stale state on its next request or refresh; it does not receive push updates.
- Revision protection requires external API clients to submit `expectedRevision`. The official frontend always does. No automatic mutation retry is performed after an ambiguous network failure; use Retry to read the committed state.
- Google Fonts are optional network resources; system fonts provide an offline fallback.
- Legacy migration is appropriate for this local assessment. A large installation would run a dedicated batch migration rather than scanning legacy data at startup.
- Automated browser regression is not packaged as a separate end-to-end suite; component/hook tests and the API suite are repeatable.

## 11. Future improvements

Authenticated sessions, retention policies, an optional historical-round archive, real-time multiplayer, and a packaged browser end-to-end suite.

## 12. Submission and review

The project includes frontend/backend source, locked dependencies, setup instructions, API contract, tests, AI workflow notes, and assumptions. GitHub publishing requires the candidate's repository/account and remains pending. The candidate should personally review and be able to explain the final source; that understanding cannot be certified by automated tests.
