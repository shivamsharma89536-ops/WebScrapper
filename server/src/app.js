const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth.routes');
const sourceRoutes = require('./routes/source.routes');
const itemRoutes = require('./routes/item.routes');
const chatRoutes = require('./routes/chat.routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(express.json({ limit: '10kb' }));
app.use(cors({ origin: 'http://localhost:5173' }));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/sources', sourceRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/chat', chatRoutes);
app.use(errorHandler);

module.exports = app;