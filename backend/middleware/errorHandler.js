/**
 * Middleware xử lý lỗi tập trung
 * Bắt tất cả lỗi chưa được handle trong routes
 */
function errorHandler(err, req, res, _next) {
  console.error(`[Error] ${req.method} ${req.url}:`, err.message);

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    error: err.message || 'Lỗi server nội bộ',
    code: err.code || 'INTERNAL_ERROR',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

module.exports = errorHandler;
