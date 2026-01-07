import { createServer } from 'http';
import env from './config/env.js';
import { connectDatabase } from './config/database.js';
import app from './app.js';
import { socketService } from './services/socket.service.js';

const startServer = async () => {
  await connectDatabase();

  // Create HTTP server and attach Socket.IO
  const httpServer = createServer(app);
  socketService.initialize(httpServer);

  httpServer.listen(env.port, () => {
    // eslint-disable-next-line no-console
    console.log(`🚀 Fixzep API listening on port ${env.port}`);
    console.log(`🔌 WebSocket server ready`);
  });
};

startServer();
