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
            StatusDistribution = statusDistribution.ToDictionary(s => s.Status, s => s.Count)
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
}

public class RecentVerification
{
    public string UserId { get; set; } = "";
    public DateTime CreatedAt { get; set; }
    public string? ScoreBin { get; set; }
}

