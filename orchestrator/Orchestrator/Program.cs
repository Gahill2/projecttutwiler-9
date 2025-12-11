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
    httpClient.Timeout = TimeSpan.FromMinutes(5); // Increase timeout for AI analysis (5 minutes)
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

app.MapGet("/db/ping", async (HttpContext context) =>
{
    var db = context.RequestServices.GetService<AppDb>();
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
        Console.WriteLine($"Verification start error: {ex.GetType().Name}: {ex.Message}");
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
        Console.WriteLine($"Verification callback error: {ex.GetType().Name}: {ex.Message}");
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
        var isAdmin = IsAdminApiKeyValid(request.ApiKey);
        
        return Results.Ok(new { 
            valid = isValid, 
            isAdmin = isAdmin 
        });
    }
    catch
    {
        return Results.StatusCode(500);
    }
});

// Portal submission endpoint
app.MapPost("/portal/submit", async (
    HttpContext context,
    VerificationService verificationService,
    AppDb db) =>
{
    try
    {
        var request = await context.Request.ReadFromJsonAsync<Models.PortalSubmitRequest>();
        if (request == null || string.IsNullOrWhiteSpace(request.Problem))
        {
            return Results.BadRequest(new { error = "Problem description is required" });
        }

        // Check if this is a verified user submission (from verified dashboard)
        // Verified users send specific name/role patterns
        var isVerifiedSubmission = (request.Name == "Verified User" && request.Role == "Verified Security Professional") 
                                   || request.SkipVerification == true;

        var result = await verificationService.ProcessPortalSubmission(
            request.Name ?? "",
            request.Role ?? "",
            request.Problem,
            request.ApiKey,
            skipVerification: isVerifiedSubmission
        );

        // Also create a CVE submission record so it appears in admin dashboard
        if (Guid.TryParse(result.UserId, out var userId))
        {
            var user = await db.AppUsers.FirstOrDefaultAsync(u => u.UserId == userId);
            var isVerified = user != null && user.Status == "verified";

            // Determine severity - default to Low for non-verified submissions
            var severity = "Low";
            if (isVerified && !string.IsNullOrEmpty(result.ScoreBin))
            {
                // Parse score bin to determine severity
                var scoreRange = result.ScoreBin.Split('-');
                if (scoreRange.Length == 2 && 
                    decimal.TryParse(scoreRange[0], out var minScore) && 
                    decimal.TryParse(scoreRange[1], out var maxScore))
                {
                    var avgScore = (minScore + maxScore) / 2 * 10; // Convert to CVSS scale
                    if (avgScore >= 9.0m) severity = "Critical";
                    else if (avgScore >= 7.0m) severity = "High";
                    else if (avgScore >= 4.0m) severity = "Moderate";
                }
            }

            // Create CVE submission record
            var submission = new Models.CveSubmission
            {
                SubmissionId = Guid.NewGuid(),
                UserId = userId,
                Description = request.Problem,
                Severity = severity,
                CvssScore = null, // Will be calculated later if needed
                Status = "pending",
                IsVerifiedUser = isVerified,
                SimilarCvesJson = null,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            db.CveSubmissions.Add(submission);
            await db.SaveChangesAsync();

            // Add submission_id to result
            result.SubmissionId = submission.SubmissionId.ToString();
        }

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

// CVE submission endpoint - stores CVE uploads for admin viewing
app.MapPost("/cve/submit", async (
    HttpContext context,
    AppDb db) =>
{
    try
    {
        var request = await context.Request.ReadFromJsonAsync<Models.CveSubmitRequest>();
        if (request == null || string.IsNullOrWhiteSpace(request.Description))
        {
            return Results.BadRequest(new { error = "CVE description is required" });
        }

        // Get or create user (simplified - in production, use proper auth)
        Guid userId;
        if (request.UserId.HasValue)
        {
            userId = request.UserId.Value;
        }
        else
        {
            // Create new user for this submission
            userId = Guid.NewGuid();
            var newUser = new AppUser
            {
                UserId = userId,
                Status = "verified", // Assume verified if submitting CVE
                LastVerifiedAt = DateTime.UtcNow,
                ModelVersion = "cve_submission"
            };
            db.AppUsers.Add(newUser);
            await db.SaveChangesAsync();
        }
        
        var user = await db.AppUsers.FirstOrDefaultAsync(u => u.UserId == userId);
        var isVerified = user?.Status == "verified";

        // Determine severity from CVSS score if provided
        var severity = "Low";
        if (request.CvssScore.HasValue)
        {
            if (request.CvssScore >= 9.0m) severity = "Critical";
            else if (request.CvssScore >= 7.0m) severity = "High";
            else if (request.CvssScore >= 4.0m) severity = "Moderate";
        }

        // Create CVE submission record
        var submission = new Models.CveSubmission
        {
            SubmissionId = Guid.NewGuid(),
            UserId = userId,
            Description = request.Description,
            Severity = severity,
            CvssScore = request.CvssScore,
            Status = "pending",
            IsVerifiedUser = isVerified,
            SimilarCvesJson = request.SimilarCves != null 
                ? System.Text.Json.JsonSerializer.Serialize(request.SimilarCves) 
                : null,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        db.CveSubmissions.Add(submission);
        await db.SaveChangesAsync();

        return Results.Ok(new
        {
            submission_id = submission.SubmissionId.ToString(),
            severity = severity,
            is_verified = isVerified,
            message = "CVE submission stored successfully. Admin will review it."
        });
    }
    catch (Exception ex)
    {
        Console.WriteLine($"CVE submission error: {ex.GetType().Name}: {ex.Message}");
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
    
    // Debug logging
    Console.WriteLine($"[Admin Key Check] Received key: '{apiKey}'");
    Console.WriteLine($"[Admin Key Check] ADMIN_API_KEYS env var: '{adminKeysEnv}'");
    Console.WriteLine($"[Admin Key Check] Parsed keys: [{string.Join(", ", adminKeys.Select(k => $"'{k}'"))}]");
    Console.WriteLine($"[Admin Key Check] Key found: {adminKeys.Contains(apiKey)}");
    
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

// Admin request endpoint (for verified users to request admin actions)
app.MapPost("/admin/request", async (HttpContext context) =>
{
    try
    {
        var request = await context.Request.ReadFromJsonAsync<Models.AdminRequestModel>();
        if (request == null || string.IsNullOrWhiteSpace(request.IssueId))
        {
            return Results.BadRequest(new { error = "Issue ID is required" });
        }

        // Store admin request (for now, just log it - could be stored in database)
        Console.WriteLine($"Admin request received: Issue={request.IssueId}, Type={request.RequestType}, Message={request.Message}");
        
        // In a real implementation, you would:
        // 1. Store the request in a database table
        // 2. Send notification to admin
        // 3. Return request ID for tracking
        
        return Results.Ok(new 
        { 
            success = true,
            request_id = Guid.NewGuid().ToString(),
            message = "Admin request submitted successfully. Admin will review your request."
        });
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Admin request error: {ex.GetType().Name}: {ex.Message}");
        return Results.Json(new { error = ex.Message }, statusCode: 500);
    }
});

// Admin CVE listing endpoint with filtering and sorting
app.MapGet("/admin/cves", async (
    HttpContext context,
    AppDb db) =>
{
    var apiKey = context.Request.Headers["X-Admin-API-Key"].FirstOrDefault() 
                 ?? context.Request.Query["api_key"].FirstOrDefault();
    
    if (!IsAdminApiKeyValid(apiKey))
    {
        return Results.Unauthorized();
    }

    try
    {
        var severity = context.Request.Query["severity"].FirstOrDefault();
        var status = context.Request.Query["status"].FirstOrDefault();
        var userType = context.Request.Query["user_type"].FirstOrDefault(); // "verified", "non_verified", or null
        var sortBy = context.Request.Query["sort_by"].FirstOrDefault() ?? "created_at";
        var sortOrder = context.Request.Query["sort_order"].FirstOrDefault() ?? "desc";
        var limit = int.TryParse(context.Request.Query["limit"].FirstOrDefault(), out var limitVal) ? limitVal : 100;
        var offset = int.TryParse(context.Request.Query["offset"].FirstOrDefault(), out var offsetVal) ? offsetVal : 0;

        var query = db.CveSubmissions.AsQueryable();

        // Apply filters
        if (!string.IsNullOrEmpty(severity))
        {
            query = query.Where(c => c.Severity == severity);
        }
        if (!string.IsNullOrEmpty(status))
        {
            query = query.Where(c => c.Status == status);
        }
        if (!string.IsNullOrEmpty(userType))
        {
            var isVerified = userType.ToLower() == "verified";
            query = query.Where(c => c.IsVerifiedUser == isVerified);
        }

        // Apply sorting
        if (sortBy == "severity")
        {
            query = sortOrder == "asc" 
                ? query.OrderBy(c => c.Severity)
                : query.OrderByDescending(c => c.Severity);
        }
        else if (sortBy == "cvss_score")
        {
            query = sortOrder == "asc"
                ? query.OrderBy(c => c.CvssScore ?? 0)
                : query.OrderByDescending(c => c.CvssScore ?? 0);
        }
        else if (sortBy == "status")
        {
            query = sortOrder == "asc"
                ? query.OrderBy(c => c.Status)
                : query.OrderByDescending(c => c.Status);
        }
        else // default: created_at
        {
            query = sortOrder == "asc"
                ? query.OrderBy(c => c.CreatedAt)
                : query.OrderByDescending(c => c.CreatedAt);
        }

        var total = await query.CountAsync();
        var cves = await query
            .Skip(offset)
            .Take(limit)
            .Select(c => new
            {
                submission_id = c.SubmissionId.ToString(),
                user_id = c.UserId.ToString(),
                description = c.Description,
                severity = c.Severity,
                cvss_score = c.CvssScore,
                status = c.Status,
                is_verified_user = c.IsVerifiedUser,
                similar_cves = c.SimilarCvesJson,
                created_at = c.CreatedAt,
                updated_at = c.UpdatedAt
            })
            .ToListAsync();

        return Results.Ok(new
        {
            total = total,
            offset = offset,
            limit = limit,
            cves = cves
        });
    }
    catch (Exception ex)
    {
        Console.WriteLine($"CVE listing error: {ex.GetType().Name}: {ex.Message}");
        return Results.Json(new { error = ex.Message }, statusCode: 500);
    }
});

// Admin AI threat analysis endpoint
app.MapPost("/admin/analyze-threat", async (
    HttpContext context,
    AppDb db) =>
{
    var apiKey = context.Request.Headers["X-Admin-API-Key"].FirstOrDefault() 
                 ?? context.Request.Query["api_key"].FirstOrDefault();
    
    if (!IsAdminApiKeyValid(apiKey))
    {
        return Results.Unauthorized();
    }

    try
    {
        var request = await context.Request.ReadFromJsonAsync<Models.ThreatAnalysisRequest>();
        if (request == null || string.IsNullOrWhiteSpace(request.SubmissionId))
        {
            return Results.BadRequest(new { error = "Submission ID is required" });
        }

        var submission = await db.CveSubmissions
            .FirstOrDefaultAsync(c => c.SubmissionId == Guid.Parse(request.SubmissionId));
        
        if (submission == null)
        {
            return Results.NotFound(new { error = "CVE submission not found" });
        }

        // Call AI-RAG service for threat analysis
        var aiRagUrl = Environment.GetEnvironmentVariable("AI_RAG_URL") ?? "http://ai-rag:9090";
        using var httpClient = new HttpClient();
        httpClient.Timeout = TimeSpan.FromSeconds(30);

        var analysisRequest = new
        {
            text = submission.Description,
            context = "admin_threat_analysis"
        };

        var analysisResponse = await httpClient.PostAsJsonAsync(
            $"{aiRagUrl}/analyze-threat-detailed",
            analysisRequest
        );

        if (!analysisResponse.IsSuccessStatusCode)
        {
            // Fallback analysis if AI service fails
            var isSuspicious = submission.Description.ToLower().Contains("test") ||
                              submission.Description.ToLower().Contains("fake") ||
                              submission.Description.Length < 20 ||
                              (submission.CvssScore.HasValue && submission.CvssScore > 9.5m && !submission.IsVerifiedUser);

            return Results.Ok(new
            {
                submission_id = request.SubmissionId,
                is_real_threat = !isSuspicious,
                is_flagged = isSuspicious,
                confidence = isSuspicious ? 0.7 : 0.5,
                flags = isSuspicious ? new[] { "Low description quality", "Potential test submission" } : Array.Empty<string>(),
                analysis = isSuspicious 
                    ? "This submission may be a test or low-quality entry. Review recommended."
                    : "Submission appears legitimate. Standard review process recommended.",
                risk_score = isSuspicious ? 0.6 : 0.3
            });
        }

        var analysisData = await analysisResponse.Content.ReadFromJsonAsync<dynamic>();
        return Results.Ok(analysisData);
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Threat analysis error: {ex.GetType().Name}: {ex.Message}");
        return Results.Json(new { error = ex.Message }, statusCode: 500);
    }
});

// Admin user analytics over time endpoint
app.MapGet("/admin/user-analytics", async (
    HttpContext context,
    AppDb db) =>
{
    var apiKey = context.Request.Headers["X-Admin-API-Key"].FirstOrDefault() 
                 ?? context.Request.Query["api_key"].FirstOrDefault();
    
    if (!IsAdminApiKeyValid(apiKey))
    {
        return Results.Unauthorized();
    }

    try
    {
        var days = int.TryParse(context.Request.Query["days"].FirstOrDefault(), out var daysVal) ? daysVal : 30;
        var now = DateTime.UtcNow;
        var startDate = now.AddDays(-days);

        // User registrations over time
        var registrations = await db.StatusAudits
            .Where(a => a.CreatedAt >= startDate)
            .GroupBy(a => new { Date = a.CreatedAt.Date })
            .Select(g => new
            {
                date = g.Key.Date.ToString("yyyy-MM-dd"),
                verified = g.Count(a => a.Status == "verified"),
                non_verified = g.Count(a => a.Status == "non_verified"),
                total = g.Count()
            })
            .OrderBy(r => r.date)
            .ToListAsync();

        // Verification rate over time
        var verificationRates = await db.StatusAudits
            .Where(a => a.CreatedAt >= startDate)
            .GroupBy(a => new { Date = a.CreatedAt.Date })
            .Select(g => new
            {
                date = g.Key.Date.ToString("yyyy-MM-dd"),
                rate = g.Count() > 0 ? (double)g.Count(a => a.Status == "verified") / g.Count() * 100 : 0
            })
            .OrderBy(r => r.date)
            .ToListAsync();

        return Results.Ok(new
        {
            registrations = registrations,
            verification_rates = verificationRates
        });
    }
    catch (Exception ex)
    {
        Console.WriteLine($"User analytics error: {ex.GetType().Name}: {ex.Message}");
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

