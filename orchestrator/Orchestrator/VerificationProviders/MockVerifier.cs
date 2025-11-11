using Microsoft.AspNetCore.Http;

namespace VerificationProviders;

public class MockVerifier : IVerifier
{
    private readonly string _redirectUri;
    private readonly string _publicWebOrigin;

    public MockVerifier(string redirectUri, string publicWebOrigin)
    {
        // Ensure we always have a valid redirect URI
        _redirectUri = string.IsNullOrWhiteSpace(redirectUri) 
            ? "http://localhost:7070/auth/callback" 
            : redirectUri;
        _publicWebOrigin = publicWebOrigin;
    }

    public Task<string> GetStartUrl(string userId, string state)
    {
        // Mock flow: immediately redirect to callback with success
        // Always use absolute URL - defensive check
        var baseUrl = string.IsNullOrWhiteSpace(_redirectUri) 
            ? "http://localhost:7070/auth/callback" 
            : _redirectUri.TrimEnd('/');
        
        // Ensure it's absolute
        if (string.IsNullOrWhiteSpace(baseUrl))
        {
            baseUrl = "http://localhost:7070/auth/callback";
        }
        else if (!baseUrl.StartsWith("http://", StringComparison.OrdinalIgnoreCase) && 
                 !baseUrl.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
        {
            baseUrl = $"http://{baseUrl}";
        }
        
        var callbackUrl = $"{baseUrl}?mock=1&ok=1&user_id={Uri.EscapeDataString(userId)}&state={Uri.EscapeDataString(state)}";
        return Task.FromResult(callbackUrl);
    }

    public Task<(bool success, string attestationRef, string[] reasons, string scoreBin)> HandleCallback(IQueryCollection query)
    {
        var ok = query["ok"].ToString();
        var success = ok == "1";
        
        var attestationRef = "mock_verification";
        var reasons = new[] { "MOCK_FLOW" };
        var scoreBin = success ? "0.8-0.9" : "0.0-0.2";

        return Task.FromResult((success, attestationRef, reasons, scoreBin));
    }
}
