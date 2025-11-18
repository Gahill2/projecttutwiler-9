using Microsoft.EntityFrameworkCore;
using Pomelo.EntityFrameworkCore.MySql.Infrastructure;
using VerificationProviders;
using Services;
using Models;
using Sentry;

// Initialize Sentry if DSN is provided
var sentryDsn = Environment.GetEnvironmentVariable("SENTRY_DSN");
if (!string.IsNullOrEmpty(sentryDsn))
{
    SentrySdk.Init(options =>
    {
        options.Dsn = sentryDsn;
        options.Environment = Environment.GetEnvironmentVariable("APP_ENV") ?? "dev";
        options.Release = Environment.GetEnvironmentVariable("GIT_SHA");
        options.TracesSampleRate = 1.0;
    });
    
    SentrySdk.ConfigureScope(scope =>
    {
        scope.SetTag("service", "orchestrator");
    });
}

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Main/Backend Database
var jawsdbUrl = Environment.GetEnvironmentVariable("JAWSDB_URL") ?? "";
var connectionString = ParseJawsDbUrl(jawsdbUrl);

if (!string.IsNullOrEmpty(connectionString))
{
    builder.Services.AddDbContext<AppDb>(options =>
        options.UseMySql(connectionString, new MySqlServerVersion(new Version(8, 0, 21)),
            mysqlOptions => mysqlOptions.EnableRetryOnFailure(
                maxRetryCount: 3,
                maxRetryDelay: TimeSpan.FromSeconds(5),
                errorNumbersToAdd: null)));
}

// Non-Verified Database (isolated - separate JawsDB instance)
var nvDbUrl = Environment.GetEnvironmentVariable("JAWSDB_NV_URL") ?? "";
var nvConnectionString = ParseJawsDbUrl(nvDbUrl);

if (!string.IsNullOrEmpty(nvConnectionString))
{
    builder.Services.AddDbContext<NvDb>(options =>
        options.UseMySql(nvConnectionString, new MySqlServerVersion(new Version(8, 0, 21)),
            mysqlOptions => mysqlOptions.EnableRetryOnFailure(
                maxRetryCount: 3,
                maxRetryDelay: TimeSpan.FromSeconds(5),
                errorNumbersToAdd: null)));
}

// Verified Database (isolated - separate JawsDB instance)
var vDbUrl = Environment.GetEnvironmentVariable("JAWSDB_V_URL") ?? "";
var vConnectionString = ParseJawsDbUrl(vDbUrl);

if (!string.IsNullOrEmpty(vConnectionString))
{
    builder.Services.AddDbContext<VDb>(options =>
        options.UseMySql(vConnectionString, new MySqlServerVersion(new Version(8, 0, 21)),
            mysqlOptions => mysqlOptions.EnableRetryOnFailure(
                maxRetryCount: 3,
                maxRetryDelay: TimeSpan.FromSeconds(5),
                errorNumbersToAdd: null)));
}

var publicWebOrigin = Environment.GetEnvironmentVariable("PUBLIC_WEB_ORIGIN") ?? "http://localhost:3000";

// Verification provider setup
// Using Mock provider by default - adapter pattern allows easy swap to Persona/Id.me/etc later
// TODO: When ready to add third-party providers, uncomment and configure:
//   - PersonaVerifier (requires PERSONA_CLIENT_ID, PERSONA_CLIENT_SECRET, PERSONA_REDIRECT_URI)
//   - IdMeVerifier (requires IDME_CLIENT_ID, IDME_CLIENT_SECRET, IDME_REDIRECT_URI)
var verifyProvider = Environment.GetEnvironmentVariable("VERIFY_PROVIDER")?.ToLower() ?? "mock";
IVerifier verifier;
string modelVersion;

if (verifyProvider == "persona")
{
    // Persona integration - ready when credentials are available
    var personaClientId = Environment.GetEnvironmentVariable("PERSONA_CLIENT_ID") ?? "";
    var personaRedirectUri = Environment.GetEnvironmentVariable("PERSONA_REDIRECT_URI") ?? "http://localhost:7070/auth/callback";
    var personaEnv = Environment.GetEnvironmentVariable("PERSONA_ENV") ?? "sandbox";
    
    verifier = new PersonaVerifier(personaClientId, personaRedirectUri, personaEnv);
    modelVersion = "persona";
}
else
{
    // Mock verifier - works immediately, no external dependencies
    // Always use gateway callback URL for mock flow
    var mockRedirectUri = "http://localhost:7070/auth/callback";
    verifier = new MockVerifier(mockRedirectUri, publicWebOrigin);
    modelVersion = "mock";
}

// Register HttpClient for AI-RAG service
builder.Services.AddHttpClient();

// Register verification service
builder.Services.AddScoped<VerificationService>(sp =>
{
    var db = sp.GetRequiredService<AppDb>();
    var httpClientFactory = sp.GetRequiredService<IHttpClientFactory>();
    var httpClient = httpClientFactory.CreateClient();
    httpClient.Timeout = TimeSpan.FromMinutes(2); // Increase timeout for AI analysis
    return new VerificationService(db, verifier, modelVersion, httpClient);
});

// Register analytics service
builder.Services.AddScoped<AnalyticsService>(sp =>
{
    var db = sp.GetRequiredService<AppDb>();
    return new AnalyticsService(db);
});

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(publicWebOrigin)
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var app = builder.Build();

app.UseCors();

app.MapGet("/health", () => new { status = "ok" });

app.MapGet("/db/ping", async (AppDb? db) =>
{
    if (db == null)
    {
        return Results.StatusCode(500);
    }
    try
    {
        await db.Database.ExecuteSqlRawAsync("SELECT 1");
        return Results.Ok(new { db = "ok" });
    }
    catch
    {
        return Results.StatusCode(500);
    }
});

// Auth endpoints
app.MapGet("/auth/start", async (HttpContext context, VerificationService verificationService) =>
{
    var user_id = context.Request.Query["user_id"].ToString();
    if (string.IsNullOrEmpty(user_id) || !Guid.TryParse(user_id, out var userId))
    {
        return Results.BadRequest(new { error = "Invalid user_id" });
    }

    try
    {
        var startUrl = await verificationService.GetStartUrl(userId.ToString());
        // Force absolute URL - always check and fix
        var trimmed = startUrl?.Trim() ?? "";
        if (string.IsNullOrWhiteSpace(trimmed) || trimmed.StartsWith("?", StringComparison.Ordinal))
        {
            var state = Guid.NewGuid().ToString();
            startUrl = $"http://localhost:7070/auth/callback?mock=1&ok=1&user_id={Uri.EscapeDataString(userId.ToString())}&state={Uri.EscapeDataString(state)}";
        }
        else if (!trimmed.StartsWith("http://", StringComparison.OrdinalIgnoreCase) && !trimmed.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
        {
            startUrl = $"http://localhost:7070{trimmed}";
        }
        else
        {
            startUrl = trimmed;
        }
        return Results.Redirect(startUrl);
    }
    catch (Exception ex)
    {
        // Log error without PII
        return Results.StatusCode(500);
    }
});

app.MapGet("/auth/callback", async (
    VerificationService verificationService,
    HttpContext context) =>
{
    try
    {
        var (success, status) = await verificationService.HandleCallback(context.Request.Query);
        
        // Redirect to frontend result page
        var redirectUrl = $"{publicWebOrigin}/auth/result?status={Uri.EscapeDataString(status)}";
        return Results.Redirect(redirectUrl);
    }
    catch (Exception ex)
    {
        // Log error without PII
        return Results.Redirect($"{publicWebOrigin}/auth/result?status=non_verified");
    }
});

app.MapGet("/user/{id}/status", async (VerificationService verificationService, string id) =>
{
    if (!Guid.TryParse(id, out var userId))
    {
        return Results.BadRequest(new { error = "Invalid user ID" });
    }

    try
    {
        var user = await verificationService.GetUserStatus(userId);
        if (user == null)
        {
            return Results.NotFound(new { error = "User not found" });
        }

        return Results.Ok(new
        {
            user_id = user.UserId.ToString(),
            status = user.Status,
            last_verified_at = user.LastVerifiedAt
        });
    }
    catch
    {
        return Results.StatusCode(500);
    }
});

// API key validation endpoint
app.MapPost("/portal/validate-api-key", async (
    HttpContext context,
    VerificationService verificationService) =>
{
    try
    {
        var request = await context.Request.ReadFromJsonAsync<Models.ApiKeyValidationRequest>();
        if (request == null || string.IsNullOrWhiteSpace(request.ApiKey))
        {
            return Results.BadRequest(new { error = "API key is required" });
        }

        var isValid = verificationService.ValidateApiKey(request.ApiKey);
        return Results.Ok(new { valid = isValid });
    }
    catch
    {
        return Results.StatusCode(500);
    }
});

// Portal submission endpoint
app.MapPost("/portal/submit", async (
    HttpContext context,
    VerificationService verificationService) =>
{
    try
    {
        var request = await context.Request.ReadFromJsonAsync<Models.PortalSubmitRequest>();
        if (request == null || string.IsNullOrWhiteSpace(request.Problem))
        {
            return Results.BadRequest(new { error = "Problem description is required" });
        }

        var result = await verificationService.ProcessPortalSubmission(
            request.Name ?? "",
            request.Role ?? "",
            request.Problem,
            request.ApiKey
        );

        return Results.Ok(result);
    }
    catch (Exception ex)
    {
        // Log error with details for debugging
        Console.WriteLine($"Portal submission error: {ex.GetType().Name}: {ex.Message}");
        Console.WriteLine($"Stack trace: {ex.StackTrace}");
        return Results.Json(new { error = ex.Message }, statusCode: 500);
    }
});

// Helper function to validate admin API key
static bool IsAdminApiKeyValid(string? apiKey)
{
    if (string.IsNullOrWhiteSpace(apiKey))
        return false;
    
    var adminKeysEnv = Environment.GetEnvironmentVariable("ADMIN_API_KEYS") ?? "";
    var adminKeys = adminKeysEnv.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
    
    return adminKeys.Contains(apiKey);
}

// Admin analytics endpoint
app.MapGet("/admin/analytics", async (
    HttpContext context,
    AnalyticsService analyticsService) =>
{
    // Check for admin API key in header or query parameter
    var apiKey = context.Request.Headers["X-Admin-API-Key"].FirstOrDefault() 
                 ?? context.Request.Query["api_key"].FirstOrDefault();
    
    if (!IsAdminApiKeyValid(apiKey))
    {
        return Results.Unauthorized();
    }

    try
    {
        var analytics = await analyticsService.GetAnalyticsAsync();
        return Results.Ok(analytics);
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Analytics error: {ex.GetType().Name}: {ex.Message}");
        return Results.Json(new { error = ex.Message }, statusCode: 500);
    }
});

app.Run();

static string ParseJawsDbUrl(string url)
{
    if (string.IsNullOrEmpty(url) || !url.StartsWith("mysql://"))
        return "";

    try
    {
        var uri = new Uri(url);
        var userInfo = uri.UserInfo.Split(':');
        var user = userInfo.Length > 0 ? userInfo[0] : "";
        var password = userInfo.Length > 1 ? Uri.UnescapeDataString(userInfo[1]) : "";
        var host = uri.Host;
        var port = uri.Port > 0 ? uri.Port : 3306;
        var database = uri.AbsolutePath.TrimStart('/');

        return $"Server={host};Port={port};Database={database};User={user};Password={password};SslMode=Required;Connection Timeout=30;MaximumPoolSize=10;";
    }
    catch
    {
        return "";
    }
}

