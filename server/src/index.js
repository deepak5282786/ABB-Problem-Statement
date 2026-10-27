import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { app } from './app.js';
import { migrateLegacySessions } from './migrate.js';

dotenv.config({ path: new URL('../.env', import.meta.url) });
const port = Number(process.env.PORT || 3001);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error('PORT must be an integer between 1 and 65535.');
  process.exit(1);
}
try {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/tic_tac_toe', {
    serverSelectionTimeoutMS: 5000,
  });
  const migrated = await migrateLegacySessions();
  if (migrated) console.log(`Preserved ${migrated} legacy sessions in the new schema.`);
  const server = app.listen(port, '127.0.0.1', () =>
    console.log(`API ready at http://localhost:${port}`),
  );
  server.on('error', async (error) => {
    console.error(`Cannot listen on port ${port}: ${error.message}`);
    await mongoose.disconnect();
    process.exit(1);
  });
  let shuttingDown = false;
  for (const signal of ['SIGINT', 'SIGTERM'])
    process.on(signal, () => {
      if (shuttingDown) return;
      shuttingDown = true;
      const deadline = setTimeout(() => process.exit(1), 10000).unref();
      server.close(async () => {
        await mongoose.disconnect();
        clearTimeout(deadline);
        process.exit(0);
      });
    });
} catch (error) {
  console.error(
    `Cannot start API: ${error.message}\nStart MongoDB using docker compose up -d or your local mongod.`,
  );
  await mongoose.disconnect();
  process.exit(1);
}
