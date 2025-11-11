using Sentry;

namespace Common.Errors;

public static class SentryHelper
{
    /// <summary>
    /// Initialize Sentry if SENTRY_DSN is set
    /// </summary>
    public static void InitSentry(string serviceName)
    {
        var dsn = Environment.GetEnvironmentVariable("SENTRY_DSN");
        if (string.IsNullOrEmpty(dsn))
        {
            return; // Silently skip if no DSN
        }

        try
        {
            SentrySdk.Init(options =>
            {
                options.Dsn = dsn;
                options.Environment = Environment.GetEnvironmentVariable("APP_ENV") ?? "dev";
                options.Release = Environment.GetEnvironmentVariable("GIT_SHA");
                options.TracesSampleRate = 1.0;
            });

            SentrySdk.ConfigureScope(scope =>
            {
                scope.SetTag("service", serviceName);
            });
        }
        catch
        {
            // Silently fail if Sentry not available
        }
    }

    /// <summary>
    /// Capture exception with service context
    /// </summary>
    public static void CaptureException(Exception exception, string serviceName, Dictionary<string, object>? context = null)
    {
        try
        {
            SentrySdk.ConfigureScope(scope =>
            {
                scope.SetTag("service", serviceName);
                if (context != null)
                {
                    scope.SetContext("additional", context);
                }
            });
            SentrySdk.CaptureException(exception);
        }
        catch
        {
            // Silently fail
        }
    }
}

