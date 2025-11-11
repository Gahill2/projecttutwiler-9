namespace VerificationProviders;

public interface IVerifier
{
    /// <summary>
    /// Get the start URL for the verification flow
    /// </summary>
    Task<string> GetStartUrl(string userId, string state);

    /// <summary>
    /// Handle the callback from the verification provider
    /// Returns: (success, attestationRef, reasons, scoreBin)
    /// </summary>
    Task<(bool success, string attestationRef, string[] reasons, string scoreBin)> HandleCallback(IQueryCollection query);
}

