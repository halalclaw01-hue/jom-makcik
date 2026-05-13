function notFoundHandler(req, res, next) {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
}

function errorHandler(error, req, res, next) {
  const statusCode = Number(error.statusCode || error.status || 500);
  const safeStatusCode = statusCode >= 400 && statusCode < 600 ? statusCode : 500;

  if (safeStatusCode >= 500) {
    console.error("[error]", {
      method: req.method,
      path: req.originalUrl,
      message: error.message,
    });
  }

  res.status(safeStatusCode).json({
    error: {
      message: safeStatusCode >= 500 ? "Internal server error" : error.message,
    },
  });
}

module.exports = { notFoundHandler, errorHandler };
