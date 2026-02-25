# Common Layer

Shared cross-module utilities:

- `errors/ApiError.ts`: explicit application error class
- `middleware/asyncHandler.ts`: async route wrapper
- `middleware/errorHandler.ts`: centralized error mapping
- `middleware/auth.ts`: authentication + RBAC authorization middleware
- `middleware/rateLimiters.ts`: API/auth request throttling
- `middleware/csrfProtection.ts`: browser-origin CSRF checks for mutating requests
- `middleware/idempotency.ts`: request deduplication for mutating requests
- `middleware/sanitizeInput.ts`: recursive request sanitization
- `middleware/requestLogger.ts`: request logging to winston
- `pagination.ts`: shared pagination/filter parsing and response metadata helpers
- `dbHelpers.ts`: domain-level DB helper functions reused across services
- `security/*.ts`: JWT, password hashing, encryption, token utilities

Use this folder only for reusable concerns that apply across multiple modules.
