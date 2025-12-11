using Microsoft.EntityFrameworkCore;
using Models;
using VerificationProviders;
using System.Net.Http.Json;

namespace Services;

public class VerificationService
{
    private readonly AppDb _db;
    private readonly IVerifier _verifier;
    private readonly string _modelVersion;
    private readonly HttpClient _httpClient;
    private readonly string _aiRagUrl;

    // In-memory state storage (TODO: replace with Redis in production)
    private static readonly Dictionary<string, string> _stateToUserId = new();

    public VerificationService(AppDb db, IVerifier verifier, string modelVersion, HttpClient? httpClient = null)
    {
        _db = db;
        _verifier = verifier;
        _modelVersion = modelVersion;
        _httpClient = httpClient ?? new HttpClient();
        _aiRagUrl = Environment.GetEnvironmentVariable("AI_RAG_URL") ?? "http://ai-rag:9090";
    }

    public string GenerateState(string userId)
    {
        var state = Guid.NewGuid().ToString();
        _stateToUserId[state] = userId;
        return state;
    }

    public string? ResolveUserId(string state)
    {
        _stateToUserId.TryGetValue(state, out var userId);
        if (userId != null)
        {
            // Clean up after use (optional, or use TTL in Redis)
            _stateToUserId.Remove(state);
        }
        return userId;
    }

    public async Task<string> GetStartUrl(string userId)
    {
        var state = GenerateState(userId);
        return await _verifier.GetStartUrl(userId, state);
    }

    public async Task<(bool success, string status)> HandleCallback(IQueryCollection query)
    {
        var state = query["state"].ToString();
        if (string.IsNullOrEmpty(state))
        {
            return (false, "non_verified");
        }

        var userIdStr = ResolveUserId(state);
        if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
        {
            return (false, "non_verified");
        }

        var (success, attestationRef, reasons, scoreBin) = await _verifier.HandleCallback(query);
        var status = success ? "verified" : "non_verified";

        // Update or create user record
        var user = await _db.AppUsers.FirstOrDefaultAsync(u => u.UserId == userId);
        if (user == null)
        {
            user = new AppUser
            {
                UserId = userId,
                Status = status,
                LastVerifiedAt = DateTime.UtcNow,
                AttestationRef = attestationRef,
                ModelVersion = _modelVersion
            };
            _db.AppUsers.Add(user);
        }
        else
        {
            user.Status = status;
            user.LastVerifiedAt = DateTime.UtcNow;
            user.AttestationRef = attestationRef;
            user.ModelVersion = _modelVersion;
        }

        // Create audit record
        var audit = new StatusAudit
        {
            AuditId = Guid.NewGuid(),
            UserId = userId,
            Status = status,
            ReasonCodesJson = System.Text.Json.JsonSerializer.Serialize(reasons),
            ScoreBin = scoreBin,
            CreatedAt = DateTime.UtcNow
        };
        _db.StatusAudits.Add(audit);

        await _db.SaveChangesAsync();

        return (success, status);
    }

    public async Task<AppUser?> GetUserStatus(Guid userId)
    {
        return await _db.AppUsers.FirstOrDefaultAsync(u => u.UserId == userId);
    }

    public bool ValidateApiKey(string? apiKey)
    {
        if (string.IsNullOrWhiteSpace(apiKey))
            return false;
        
        // Get valid API keys from environment (comma-separated)
        var verifiedKeysEnv = Environment.GetEnvironmentVariable("VERIFIED_API_KEYS") ?? "";
        var verifiedKeys = verifiedKeysEnv.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        
        // Also check admin keys (admin keys can be used in portal for convenience)
        var adminKeysEnv = Environment.GetEnvironmentVariable("ADMIN_API_KEYS") ?? "";
        var adminKeys = adminKeysEnv.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        
        // Combine both lists
        var allValidKeys = verifiedKeys.Concat(adminKeys).ToList();
        
        return allValidKeys.Contains(apiKey);
    }

    public async Task<PortalSubmissionResult> ProcessPortalSubmission(string name, string role, string problem, string? apiKey = null, bool skipVerification = false)
    {
        var userId = Guid.NewGuid();
        string status;
        string? scoreBin = null;
        List<string> reasonCodes;
        
        // Check if API key is provided and valid - skip AI analysis if so
        if (!string.IsNullOrWhiteSpace(apiKey) && ValidateApiKey(apiKey))
        {
            // API key authentication - automatically verified
            status = "verified";
            reasonCodes = new List<string> { "api_key_authenticated", "privileged_access" };
            scoreBin = "1.0-1.0"; // Maximum confidence for API key auth
        }
        else if (skipVerification)
        {
            // Skip AI verification for already-verified users (fast path)
            status = "verified";
            reasonCodes = new List<string> { "already_verified", "skip_ai_verification" };
            scoreBin = "1.0-1.0"; // Maximum confidence for verified users
        }
        else
        {
            // Normal AI-based verification flow
            // Build analysis text with user identity and problem
            var analysisText = $"User: {name}\nRole: {role}\nProblem: {problem}";
            
            // Call AI-RAG service to analyze with timeout handling
            var analyzeRequest = new
            {
                text = analysisText,
                top_k = 5
            };
            
            try
            {
                // Use cancellation token with shorter timeout for faster response
                using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(10)); // 10 second timeout - fail fast
                var analyzeResponse = await _httpClient.PostAsJsonAsync($"{_aiRagUrl}/analyze", analyzeRequest, cts.Token);
                
                if (!analyzeResponse.IsSuccessStatusCode)
                {
                    var errorContent = await analyzeResponse.Content.ReadAsStringAsync();
                    // If AI service fails, default to non-verified but don't throw
                    status = "non_verified";
                    reasonCodes = new List<string> { "ai_analysis_failed", "default_non_verified" };
                    scoreBin = "0.0-0.5";
                }
                else
                {
                    var analyzeResult = await analyzeResponse.Content.ReadFromJsonAsync<AiRagAnalysisResult>();
                    if (analyzeResult == null)
                    {
                        status = "non_verified";
                        reasonCodes = new List<string> { "analysis_result_null", "default_non_verified" };
                        scoreBin = "0.0-0.5";
                    }
                    else
                    {
                        status = analyzeResult.Decision == "verified" ? "verified" : "non_verified";
                        reasonCodes = analyzeResult.ReasonCodes ?? new List<string> { "analysis_complete" };
                        scoreBin = analyzeResult.ScoreBin;
                    }
                }
            }
            catch (TaskCanceledException)
            {
                // Timeout - default to non-verified
                status = "non_verified";
                reasonCodes = new List<string> { "ai_analysis_timeout", "default_non_verified" };
                scoreBin = "0.0-0.5";
            }
            catch (Exception ex)
            {
                // Any other error - default to non-verified
                status = "non_verified";
                reasonCodes = new List<string> { "ai_analysis_error", "default_non_verified" };
                scoreBin = "0.0-0.5";
                // Log but don't throw
                Console.WriteLine($"AI analysis error (non-fatal): {ex.Message}");
            }
        }
        
        // Create user record in main database
        var user = new AppUser
        {
            UserId = userId,
            Status = status,
            LastVerifiedAt = DateTime.UtcNow,
            AttestationRef = null,
            ModelVersion = _modelVersion
        };
        _db.AppUsers.Add(user);
        
        // Save user first to satisfy foreign key constraint
        await _db.SaveChangesAsync();
        
        // Create audit record (after user is saved)
        var audit = new StatusAudit
        {
            AuditId = Guid.NewGuid(),
            UserId = userId,
            Status = status,
            ReasonCodesJson = System.Text.Json.JsonSerializer.Serialize(reasonCodes),
            ScoreBin = scoreBin,
            CreatedAt = DateTime.UtcNow
        };
        _db.StatusAudits.Add(audit);
        
        // Save audit record
        await _db.SaveChangesAsync();
        
        // Store metrics in NV or V database via ETL services
        try
        {
            var etlUrl = status == "verified" 
                ? (Environment.GetEnvironmentVariable("ETL_V_URL") ?? "http://etl-v:9102")
                : (Environment.GetEnvironmentVariable("ETL_NV_URL") ?? "http://etl-nv:9101");
            
            var sessionRequest = new
            {
                user_id = userId.ToString(),
                status = status,
                score_bin = scoreBin,
                reason_codes = reasonCodes
            };
            
            var sessionResponse = await _httpClient.PostAsJsonAsync($"{etlUrl}/session", sessionRequest);
            // Don't fail if ETL service is unavailable - just log
            if (!sessionResponse.IsSuccessStatusCode)
            {
                // Log error but continue
            }
        }
        catch
        {
            // ETL service unavailable - continue anyway
        }
        
        return new PortalSubmissionResult
        {
            UserId = userId.ToString(),
            Status = status,
            Decision = status,
            ScoreBin = scoreBin,
            ReasonCodes = reasonCodes
        };
    }
}

public class AiRagAnalysisResult
{
    public string Decision { get; set; } = "non_verified";
    public string? ScoreBin { get; set; }
    public List<string>? ReasonCodes { get; set; }
}

public class PortalSubmissionResult
{
    public string UserId { get; set; } = "";
    public string Status { get; set; } = "non_verified";
    public string Decision { get; set; } = "non_verified";
    public string? ScoreBin { get; set; }
    public List<string>? ReasonCodes { get; set; }
    public string? SubmissionId { get; set; }
}

