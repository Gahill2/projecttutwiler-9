using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Models;

[Table("app_users")]
public class AppUser
{
    [Key]
    [Column("user_id")]
    public Guid UserId { get; set; }

    [Column("status")]
    [MaxLength(16)]
    public string Status { get; set; } = string.Empty; // "verified" or "non_verified"

    [Column("last_verified_at")]
    public DateTime? LastVerifiedAt { get; set; }

    [Column("attestation_ref")]
    [MaxLength(64)]
    public string? AttestationRef { get; set; }

    [Column("model_version")]
    [MaxLength(16)]
    public string? ModelVersion { get; set; }
}

