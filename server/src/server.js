require('dotenv').config();

const app = require('./app');
const connectDB = require('./config/db');
const { startScheduler } = require('./services/scheduler.service');

const port = process.env.PORT || 5000;

async function startServer() {
  if (!process.env.JWT_SECRET || Buffer.byteLength(process.env.JWT_SECRET) < 32) {
    throw new Error('JWT_SECRET must be set to a value at least 32 bytes long');
  }

  await connectDB();
  await startScheduler();

  app.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exitCode = 1;
});