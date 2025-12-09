using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Models;

[Table("cve_submissions")]
public class CveSubmission
{
    [Key]
    [Column("submission_id")]
    public Guid SubmissionId { get; set; }

    [Column("user_id")]
    public Guid UserId { get; set; }

    [Column("description")]
    [MaxLength(2000)]
    public string Description { get; set; } = string.Empty;

    [Column("severity")]
    [MaxLength(16)]
    public string Severity { get; set; } = string.Empty; // Critical, High, Moderate, Low

    [Column("cvss_score")]
    public decimal? CvssScore { get; set; }

    [Column("status")]
    [MaxLength(16)]
    public string Status { get; set; } = "pending"; // pending, reviewed, resolved

    [Column("is_verified_user")]
    public bool IsVerifiedUser { get; set; }

    [Column("similar_cves_json")]
    public string? SimilarCvesJson { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; }
}

