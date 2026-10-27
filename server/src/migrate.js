import { Session } from './models/session.js';
import { emptyScoreboard } from './services/game-service.js';

// Preserve existing local games/scores from the first schema. Inserts only;
// never overwrites a refactored session or removes the original documents.
export async function migrateLegacySessions() {
  const database = Session.db;
  const games = database.collection('games');
  const scores = database.collection('scores');
  const visited = new Set();
  let migrated = 0;
  async function insert(sessionId, game, scoreboard) {
    const result = await Session.updateOne(
      { _id: sessionId },
      {
        $setOnInsert: { game, scoreboard, revision: 0 },
      },
      { upsert: true, runValidators: true, timestamps: false },
    );
    migrated += result.upsertedCount;
  }
  for await (const legacy of games.find().sort({ updatedAt: -1 })) {
    if (visited.has(legacy.sessionId)) continue;
    visited.add(legacy.sessionId);
    const score = await scores.findOne({ _id: legacy.sessionId });
    const scoreboard = score
      ? { xWins: score.xWins ?? 0, oWins: score.oWins ?? 0, draws: score.draws ?? 0 }
      : emptyScoreboard();
    await insert(legacy.sessionId, { ...legacy.state, id: legacy._id.toString() }, scoreboard);
  }
  for await (const score of scores.find()) {
    if (visited.has(score._id)) continue;
    await insert(score._id, null, {
      xWins: score.xWins ?? 0,
      oWins: score.oWins ?? 0,
      draws: score.draws ?? 0,
    });
  }
  return migrated;
}
