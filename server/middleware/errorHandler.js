function errorHandler(err, req, res, next) {
  const status = err && err.statusCode ? err.statusCode : 500;
  const message = err && err.message ? err.message : 'Internal server error';
  const payload = {
    status,
    code: err && err.code ? err.code : 'SERVER_ERROR',
    message,
    timestamp: new Date().toISOString(),
  };

  if (status >= 500) {
    console.error('[Unhandled Error]', err);
  }

  return res.status(status).json(payload);
}

module.exports = { errorHandler };
