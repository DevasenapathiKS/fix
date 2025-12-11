import env from './config/env.js';
import { connectDatabase } from './config/database.js';
import app from './app.js';

const startServer = async () => {
  await connectDatabase();

  app.listen(env.port, () => {
    // eslint-disable-next-line no-console
    console.log(`🚀 Fixzep API listening on port ${env.port}`);
  });
};

startServer();
