namespace Models;

public class PortalSubmitRequest
{
    public string? Name { get; set; }
    public string? Role { get; set; }
    public string Problem { get; set; } = "";
    public string? ApiKey { get; set; }
}

public class ApiKeyValidationRequest
{
    public string ApiKey { get; set; } = "";
}

public class AdminRequestModel
{
    public string IssueId { get; set; } = "";
    public string RequestType { get; set; } = "";
    public string Message { get; set; } = "";
}

public class CveSubmitRequest
{
    public Guid? UserId { get; set; }
    public string Description { get; set; } = "";
    public decimal? CvssScore { get; set; }
    public List<SimilarCve>? SimilarCves { get; set; }
}

public class SimilarCve
{
    public string Id { get; set; } = "";
    public double Score { get; set; }
    public string Description { get; set; } = "";
}

public class ThreatAnalysisRequest
{
    public string SubmissionId { get; set; } = "";
}

