import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import path from 'path';

import { HOST, PORT, STATIC_DIR } from './config';
import { requestLogger } from './middleware/logger';
import { errorHandler } from './middleware/errorHandler';
import apiRoutes from './routes/api';
import { initWsServer, stopWsServer } from './websocket/WsServer';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(requestLogger);

// API routes
app.use('/api', apiRoutes);

// Static file serving (React SPA)
const staticPath = path.resolve(__dirname, STATIC_DIR);
app.use(express.static(staticPath));

// SPA fallback — serve index.html for any non-API route
app.get('*', (_req, res) => {
  res.sendFile(path.join(staticPath, 'index.html'));
});

// Error handler (must be last)
app.use(errorHandler);

// Create HTTP server and attach WebSocket
const httpServer = createServer(app);
initWsServer(httpServer);

httpServer.listen(PORT, HOST, () => {
  console.log(`Web Renderer 2 server running at http://${HOST}:${PORT}`);
  console.log(`Static files served from: ${staticPath}`);
});

// Graceful shutdown
function shutdown(): void {
  console.log('\nShutting down...');
  stopWsServer();
  httpServer.close(() => {
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
