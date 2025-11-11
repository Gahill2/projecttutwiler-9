using Microsoft.EntityFrameworkCore;
using Models;

// Main/Backend Database Context
public class AppDb : DbContext
{
    public AppDb(DbContextOptions<AppDb> options) : base(options) { }
    
    public DbSet<AppUser> AppUsers { get; set; }
    public DbSet<StatusAudit> StatusAudits { get; set; }
    
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        
        modelBuilder.Entity<AppUser>(entity =>
        {
            entity.HasKey(e => e.UserId);
            entity.Property(e => e.Status).HasMaxLength(16);
            entity.Property(e => e.AttestationRef).HasMaxLength(64);
            entity.Property(e => e.ModelVersion).HasMaxLength(16);
        });
        
        modelBuilder.Entity<StatusAudit>(entity =>
        {
            entity.HasKey(e => e.AuditId);
            entity.Property(e => e.Status).HasMaxLength(16);
            entity.Property(e => e.ScoreBin).HasMaxLength(16);
        });
    }
}

// Non-Verified Database Context (isolated)
public class NvDb : DbContext
{
    public NvDb(DbContextOptions<NvDb> options) : base(options) { }
    
    // Tables for non-verified user metrics/status
    // Separate database instance - different credentials
}

// Verified Database Context (isolated)
public class VDb : DbContext
{
    public VDb(DbContextOptions<VDb> options) : base(options) { }
    
    // Tables for verified user metrics/status
    // Separate database instance - different credentials
}

