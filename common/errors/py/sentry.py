"""
Initialize Sentry for Python services (AI-RAG, CVE Ingestor)
Only initializes if SENTRY_DSN is set
"""
import os

def init_sentry(service_name: str):
    """Initialize Sentry if DSN is provided"""
    sentry_dsn = os.getenv("SENTRY_DSN")
    if not sentry_dsn:
        return None
    
    try:
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration
        from sentry_sdk.integrations.logging import LoggingIntegration
        
        sentry_sdk.init(
            dsn=sentry_dsn,
            integrations=[
                FastApiIntegration(),
                LoggingIntegration(level=None, event_level=None),
            ],
            traces_sample_rate=1.0,
            environment=os.getenv("APP_ENV", "dev"),
            release=os.getenv("GIT_SHA"),
        )
        
        # Tag all events with service name
        sentry_sdk.set_tag("service", service_name)
        
        return sentry_sdk
    except ImportError:
        # Sentry SDK not installed, silently continue
        return None

def capture_exception(error: Exception, service_name: str, context: dict = None):
    """Capture exception with service context"""
    try:
        import sentry_sdk
        sentry_sdk.set_tag("service", service_name)
        if context:
            sentry_sdk.set_context("additional", context)
        sentry_sdk.capture_exception(error)
    except (ImportError, Exception):
        # Silently fail if Sentry not available
        pass

