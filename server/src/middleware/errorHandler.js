function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Request body must contain valid JSON' });
  }

  if (error.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request body is too large' });
  }

  if (error.name === 'ValidationError' || error.name === 'CastError') {
    return res.status(400).json({ error: 'Invalid request data' });
  }

  if (error.code === 11000) {
    return res.status(409).json({ error: 'A record with that value already exists' });
  }

  if (Number.isInteger(error.statusCode) && error.statusCode >= 400 && error.statusCode < 600) {
    return res.status(error.statusCode).json({ error: error.message });
  }

  console.error('Request failed:', error);
  return res.status(500).json({ error: 'Internal server error' });
}

module.exports = errorHandler;
