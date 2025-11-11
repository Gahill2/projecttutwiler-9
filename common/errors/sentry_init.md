# Sentry Error Logging

Optional error logging across services using Sentry SDK.

## Setup

Set `SENTRY_DSN` environment variable to enable error logging. If not set, all services will run silently without error tracking.

## Service Integration

### Frontend (Next.js)
- Uses `NEXT_PUBLIC_SENTRY_DSN` (wired from `SENTRY_DSN`)
- Initialize in `app/layout.tsx` or a client component
- See `js/sentry.ts` for helper

### API Gateway (Express/TypeScript)
- Initialize early in `src/index.ts`
- See `js/sentry.ts` for helper

### AI-RAG (FastAPI/Python)
- Initialize before creating FastAPI app
- See `py/sentry.py` for helper

### CVE Ingestor (FastAPI/Python)
- Initialize before creating FastAPI app
- See `py/sentry.py` for helper

### Orchestrator (.NET)
- Initialize early in `Program.cs`
- See `dotnet/Sentry.cs` for helper

## Tagging

All events are automatically tagged with:
- `service`: Service name (e.g., "ai-rag", "cve-ingestor")
- `environment`: From `APP_ENV` (default: "dev")
- `release`: From `GIT_SHA` if available
- `request_id`: From request headers if available

