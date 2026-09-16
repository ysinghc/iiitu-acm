/**
 * Shared request-handling primitives.
 * Services throw ApiError; asyncHandler forwards it to the error middleware,
 * so controllers stay thin and never need try/catch.
 */

class ApiError extends Error {
  constructor(statusCode, message, details = undefined) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }

  static badRequest(message = 'Invalid request', details) {
    return new ApiError(400, message, details);
  }
  static unauthorized(message = 'Authentication required') {
    return new ApiError(401, message);
  }
  static forbidden(message = 'You do not have permission for this action') {
    return new ApiError(403, message);
  }
  static notFound(message = 'Resource not found') {
    return new ApiError(404, message);
  }
  static conflict(message = 'Resource already exists') {
    return new ApiError(409, message);
  }
}

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const toPublicUrl = (maybeRelative) => maybeRelative || '';

module.exports = { ApiError, asyncHandler, toPublicUrl };
