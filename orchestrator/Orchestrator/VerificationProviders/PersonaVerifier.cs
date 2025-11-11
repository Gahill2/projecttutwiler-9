using Microsoft.AspNetCore.Http;

namespace VerificationProviders;

public class PersonaVerifier : IVerifier
{
    private readonly string _clientId;
    private readonly string _redirectUri;
    private readonly string _environment;

    public PersonaVerifier(string clientId, string redirectUri, string environment)
    {
        _clientId = clientId;
        _redirectUri = redirectUri;
        _environment = environment;
    }

    public Task<string> GetStartUrl(string userId, string state)
    {
        // Persona hosted flow URL
        // TODO: Update base URL when Persona provides sandbox details
        var baseUrl = _environment == "sandbox" 
            ? "https://withpersona.com" 
            : "https://withpersona.com";
        
        var startUrl = $"{baseUrl}/verify/start" +
            $"?client_id={Uri.EscapeDataString(_clientId)}" +
            $"&redirect_uri={Uri.EscapeDataString(_redirectUri)}" +
            $"&state={Uri.EscapeDataString(state)}" +
            $"&scope=identity";

        return Task.FromResult(startUrl);
    }

    public async Task<(bool success, string attestationRef, string[] reasons, string scoreBin)> HandleCallback(IQueryCollection query)
    {
        var state = query["state"].ToString();
        var code = query["code"].ToString();
        var inquiryId = query["inquiry-id"].ToString();

        // TODO: Exchange code for token with Persona API
        // TODO: Call Persona inquiry API to get verification result
        // For now, stub with sandbox success response
        // When Persona credentials are available, implement:
        // 1. POST to Persona token endpoint with code
        // 2. Use token to call Persona inquiry API
        // 3. Parse verification status from inquiry response

        // Stub response for sandbox
        var success = !string.IsNullOrEmpty(code) || !string.IsNullOrEmpty(inquiryId);
        var attestationRef = !string.IsNullOrEmpty(inquiryId) ? inquiryId : "persona_sbx";
        var reasons = new[] { "PERSONA_SANDBOX" };
        var scoreBin = success ? "0.8-0.9" : "0.0-0.2";

        return (success, attestationRef, reasons, scoreBin);
    }
}

