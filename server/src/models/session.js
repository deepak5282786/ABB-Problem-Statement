import mongoose from 'mongoose';

const options = { _id: false };
const moveSchema = new mongoose.Schema(
  {
    number: { type: Number, required: true, min: 1, max: 9 },
    player: { type: String, enum: ['X', 'O'], required: true },
    cellIndex: { type: Number, required: true, min: 0, max: 8 },
    row: { type: Number, required: true, min: 1, max: 3 },
    column: { type: Number, required: true, min: 1, max: 3 },
  },
  options,
);
const gameSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    mode: { type: String, enum: ['two-player', 'computer'], required: true },
    board: {
      type: [String],
      validate: (value) =>
        value.length === 9 && value.every((cell) => cell === null || ['X', 'O'].includes(cell)),
    },
    currentPlayer: { type: String, enum: ['X', 'O'], required: true },
    status: { type: String, enum: ['InProgress', 'Won', 'Draw'], required: true },
    winner: { type: String, enum: ['X', 'O', null], default: null },
    winningCells: [Number],
    moves: [moveSchema],
  },
  options,
);
const scoreSchema = new mongoose.Schema(
  {
    xWins: { type: Number, default: 0, min: 0 },
    oWins: { type: Number, default: 0, min: 0 },
    draws: { type: Number, default: 0, min: 0 },
  },
  options,
);

// The active game and scores share one document: a move and its result commit together.
// Optimistic concurrency compares the revision in MongoDB, across API processes.
const sessionSchema = new mongoose.Schema(
  {
    _id: String,
    game: { type: gameSchema, default: null },
    scoreboard: { type: scoreSchema, default: () => ({}) },
  },
  { timestamps: true, versionKey: 'revision', optimisticConcurrency: true },
);

export const Session = mongoose.model('Session', sessionSchema);
