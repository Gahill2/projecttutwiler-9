using Microsoft.EntityFrameworkCore;
using Models;

namespace Services;

public class AnalyticsService
{
    private readonly AppDb _db;

    public AnalyticsService(AppDb db)
    {
        _db = db;
    }

    public async Task<AnalyticsData> GetAnalyticsAsync()
    {
        var now = DateTime.UtcNow;
        var last24Hours = now.AddHours(-24);
        var last7Days = now.AddDays(-7);
        var last30Days = now.AddDays(-30);

        // Total users
        var totalUsers = await _db.AppUsers.CountAsync();

        // Verified vs Non-Verified counts
        var verifiedCount = await _db.AppUsers.CountAsync(u => u.Status == "verified");
        var nonVerifiedCount = await _db.AppUsers.CountAsync(u => u.Status == "non_verified");

        // Recent activity (last 24 hours, 7 days, 30 days)
        var recent24h = await _db.StatusAudits.CountAsync(a => a.CreatedAt >= last24Hours);
        var recent7d = await _db.StatusAudits.CountAsync(a => a.CreatedAt >= last7Days);
        var recent30d = await _db.StatusAudits.CountAsync(a => a.CreatedAt >= last30Days);

        // Verification rate (verified / total in last 30 days)
        var verified30d = await _db.StatusAudits.CountAsync(a => 
            a.CreatedAt >= last30Days && a.Status == "verified");
        var total30d = await _db.StatusAudits.CountAsync(a => a.CreatedAt >= last30Days);
        var verificationRate = total30d > 0 ? (double)verified30d / total30d * 100 : 0;

        // Recent verifications (last 7 days)
        var recentVerifications = await _db.StatusAudits
            .Where(a => a.CreatedAt >= last7Days && a.Status == "verified")
            .OrderByDescending(a => a.CreatedAt)
            .Take(10)
            .Select(a => new
            {
                a.UserId,
                a.CreatedAt,
                a.ScoreBin
            })
            .ToListAsync();

        // Status distribution
        var statusDistribution = await _db.StatusAudits
            .Where(a => a.CreatedAt >= last30Days)
            .GroupBy(a => a.Status)
            .Select(g => new { Status = g.Key, Count = g.Count() })
            .ToListAsync();

        // CVE submission counts
        var totalCveSubmissions = await _db.CveSubmissions.CountAsync();
        var verifiedCveSubmissions = await _db.CveSubmissions.CountAsync(c => c.IsVerifiedUser);
        var pendingCveSubmissions = await _db.CveSubmissions.CountAsync(c => c.Status == "pending");
        var criticalCveSubmissions = await _db.CveSubmissions.CountAsync(c => c.Severity == "Critical");

        // FAKE CVE DETECTION ANALYTICS
        // Users with multiple submissions (potential spam)
        var usersWithMultipleSubmissions = await _db.CveSubmissions
            .GroupBy(c => c.UserId)
            .Where(g => g.Count() > 1)
            .Select(g => new { UserId = g.Key, Count = g.Count() })
            .OrderByDescending(x => x.Count)
            .Take(20)
            .ToListAsync();

        // Users with high submission frequency (suspicious)
        var highFrequencyUsers = await _db.CveSubmissions
            .Where(c => c.CreatedAt >= last24Hours)
            .GroupBy(c => c.UserId)
            .Where(g => g.Count() >= 3) // 3+ submissions in 24h
            .Select(g => new { UserId = g.Key, Count = g.Count() })
            .ToListAsync();

        // Duplicate/similar descriptions (potential fake CVEs)
        var duplicateDescriptions = await _db.CveSubmissions
            .GroupBy(c => c.Description.ToLower().Trim())
            .Where(g => g.Count() > 1)
            .Select(g => new { Description = g.Key, Count = g.Count(), UserIds = g.Select(c => c.UserId).Distinct().Count() })
            .OrderByDescending(x => x.Count)
            .Take(20)
            .ToListAsync();

        // Non-verified users with many submissions (suspicious)
        var suspiciousNonVerified = await _db.CveSubmissions
            .Where(c => !c.IsVerifiedUser)
            .GroupBy(c => c.UserId)
            .Where(g => g.Count() >= 2)
            .Select(g => new { UserId = g.Key, Count = g.Count() })
            .OrderByDescending(x => x.Count)
            .Take(20)
            .ToListAsync();

        // Recent submissions by time (detect bot patterns)
        var recentSubmissionsByHour = await _db.CveSubmissions
            .Where(c => c.CreatedAt >= last24Hours)
            .GroupBy(c => new { Hour = c.CreatedAt.Hour, UserId = c.UserId })
            .Where(g => g.Count() >= 2) // Multiple submissions in same hour
            .Select(g => new { g.Key.Hour, g.Key.UserId, Count = g.Count() })
            .ToListAsync();

        // Low-quality submissions (very short descriptions)
        var lowQualitySubmissions = await _db.CveSubmissions
            .Where(c => c.Description.Length < 50)
            .CountAsync();

        // Submissions with generic/test descriptions
        var genericDescriptions = await _db.CveSubmissions
            .Where(c => c.Description.ToLower().Contains("test") || 
                       c.Description.ToLower().Contains("fake") ||
                       c.Description.ToLower().Contains("asdf") ||
                       c.Description.ToLower().Contains("qwerty") ||
                       c.Description.Length < 20)
            .CountAsync();

        // User submission timeline (last 7 days)
        var submissionsByDay = await _db.CveSubmissions
            .Where(c => c.CreatedAt >= last7Days)
            .GroupBy(c => c.CreatedAt.Date)
            .Select(g => new { Date = g.Key, Count = g.Count() })
            .OrderBy(x => x.Date)
            .ToListAsync();

        return new AnalyticsData
        {
            TotalUsers = totalUsers,
            VerifiedUsers = verifiedCount,
            NonVerifiedUsers = nonVerifiedCount,
            RecentActivity24h = recent24h,
            RecentActivity7d = recent7d,
            RecentActivity30d = recent30d,
            VerificationRate = Math.Round(verificationRate, 2),
            RecentVerifications = recentVerifications.Select(r => new RecentVerification
            {
                UserId = r.UserId.ToString(),
                CreatedAt = r.CreatedAt,
                ScoreBin = r.ScoreBin
            }).ToList(),
            StatusDistribution = statusDistribution.ToDictionary(s => s.Status, s => s.Count),
            TotalCveSubmissions = totalCveSubmissions,
            VerifiedCveSubmissions = verifiedCveSubmissions,
            PendingCveSubmissions = pendingCveSubmissions,
            CriticalCveSubmissions = criticalCveSubmissions,
            // Fake CVE Detection Stats
            UsersWithMultipleSubmissions = usersWithMultipleSubmissions.Select(u => new UserSubmissionCount
            {
                UserId = u.UserId.ToString(),
                SubmissionCount = u.Count
            }).ToList(),
            HighFrequencyUsers = highFrequencyUsers.Select(u => new UserSubmissionCount
            {
                UserId = u.UserId.ToString(),
                SubmissionCount = u.Count
            }).ToList(),
            DuplicateDescriptions = duplicateDescriptions.Select(d => new DuplicateDescription
            {
                Description = d.Description,
                Count = d.Count,
                UniqueUsers = d.UserIds
            }).ToList(),
            SuspiciousNonVerifiedUsers = suspiciousNonVerified.Select(u => new UserSubmissionCount
            {
                UserId = u.UserId.ToString(),
                SubmissionCount = u.Count
            }).ToList(),
            LowQualitySubmissions = lowQualitySubmissions,
            GenericSubmissions = genericDescriptions,
            SubmissionsByDay = submissionsByDay.Select(s => new DailySubmission
            {
                Date = s.Date,
                Count = s.Count
            }).ToList()
        };
    }
}

public class AnalyticsData
{
    public int TotalUsers { get; set; }
    public int VerifiedUsers { get; set; }
    public int NonVerifiedUsers { get; set; }
    public int RecentActivity24h { get; set; }
    public int RecentActivity7d { get; set; }
    public int RecentActivity30d { get; set; }
    public double VerificationRate { get; set; }
    public List<RecentVerification> RecentVerifications { get; set; } = new();
    public Dictionary<string, int> StatusDistribution { get; set; } = new();
    public int TotalCveSubmissions { get; set; }
    public int VerifiedCveSubmissions { get; set; }
    public int PendingCveSubmissions { get; set; }
    public int CriticalCveSubmissions { get; set; }
    // Fake CVE Detection
    public List<UserSubmissionCount> UsersWithMultipleSubmissions { get; set; } = new();
    public List<UserSubmissionCount> HighFrequencyUsers { get; set; } = new();
    public List<DuplicateDescription> DuplicateDescriptions { get; set; } = new();
    public List<UserSubmissionCount> SuspiciousNonVerifiedUsers { get; set; } = new();
    public int LowQualitySubmissions { get; set; }
    public int GenericSubmissions { get; set; }
    public List<DailySubmission> SubmissionsByDay { get; set; } = new();
}

public class RecentVerification
{
    public string UserId { get; set; } = "";
    public DateTime CreatedAt { get; set; }
    public string? ScoreBin { get; set; }
}

public class UserSubmissionCount
{
    public string UserId { get; set; } = "";
    public int SubmissionCount { get; set; }
}

public class DuplicateDescription
{
    public string Description { get; set; } = "";
    public int Count { get; set; }
    public int UniqueUsers { get; set; }
}

public class DailySubmission
{
    public DateTime Date { get; set; }
    public int Count { get; set; }
}

