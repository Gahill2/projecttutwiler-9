/**
 * Initialize Sentry for JavaScript/TypeScript services (Frontend, API Gateway)
 * Only initializes if SENTRY_DSN or NEXT_PUBLIC_SENTRY_DSN is set
 */
export function initSentry(serviceName: string): void {
  const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
  
  if (!dsn) {
    return; // Silently skip if no DSN
  }
  
  try {
    // Dynamic import to avoid errors if @sentry/nextjs or @sentry/node not installed
    if (typeof window !== 'undefined') {
      // Browser/Next.js client-side
      import('@sentry/nextjs').then((Sentry) => {
        Sentry.init({
          dsn,
          environment: process.env.APP_ENV || process.env.NODE_ENV || 'dev',
          release: process.env.GIT_SHA,
          tracesSampleRate: 1.0,
        });
        Sentry.setTag('service', serviceName);
      }).catch(() => {
        // Sentry SDK not installed, silently continue
      });
    } else {
      // Node.js (API Gateway)
      import('@sentry/node').then((Sentry) => {
        Sentry.init({
          dsn,
          environment: process.env.APP_ENV || process.env.NODE_ENV || 'dev',
          release: process.env.GIT_SHA,
          tracesSampleRate: 1.0,
        });
        Sentry.setTag('service', serviceName);
      }).catch(() => {
        // Sentry SDK not installed, silently continue
      });
    }
  } catch (error) {
    // Silently fail if Sentry not available
  }
}

/**
 * Capture exception with service context
 */
export function captureException(error: Error, serviceName: string, context?: Record<string, any>): void {
  try {
    if (typeof window !== 'undefined') {
      import('@sentry/nextjs').then((Sentry) => {
        Sentry.setTag('service', serviceName);
        if (context) {
          Sentry.setContext('additional', context);
        }
        Sentry.captureException(error);
      }).catch(() => {});
    } else {
      import('@sentry/node').then((Sentry) => {
        Sentry.setTag('service', serviceName);
        if (context) {
          Sentry.setContext('additional', context);
        }
        Sentry.captureException(error);
      }).catch(() => {});
    }
  } catch {
    // Silently fail
  }
}

