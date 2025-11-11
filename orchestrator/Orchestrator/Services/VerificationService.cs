using Microsoft.EntityFrameworkCore;
using Models;
using VerificationProviders;

namespace Services;

public class VerificationService
{
    private readonly AppDb _db;
    private readonly IVerifier _verifier;
    private readonly string _modelVersion;

    // In-memory state storage (TODO: replace with Redis in production)
    private static readonly Dictionary<string, string> _stateToUserId = new();

    public VerificationService(AppDb db, IVerifier verifier, string modelVersion)
    {
        _db = db;
        _verifier = verifier;
        _modelVersion = modelVersion;
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
}

