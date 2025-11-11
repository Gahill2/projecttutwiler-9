using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Models;

[Table("app_status_audit")]
public class StatusAudit
{
    [Key]
    [Column("audit_id")]
    public Guid AuditId { get; set; }

    [Column("user_id")]
    public Guid UserId { get; set; }

    [Column("status")]
    [MaxLength(16)]
    public string Status { get; set; } = string.Empty;

    [Column("reason_codes_json")]
    public string ReasonCodesJson { get; set; } = "[]";

    [Column("score_bin")]
    [MaxLength(16)]
    public string? ScoreBin { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

