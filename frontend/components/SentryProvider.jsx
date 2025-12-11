'use client'

export function SentryProvider({ children }) {
  // Sentry is optional - if NEXT_PUBLIC_SENTRY_DSN is not set or package not installed,
  // this component just passes through children without any initialization
  // This avoids build-time errors when @sentry/nextjs is not in package.json
  
  return <>{children}</>
}

