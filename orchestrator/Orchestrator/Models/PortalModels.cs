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

