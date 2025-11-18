# Generate Secure Admin API Key
# IMPORTANT: Admin keys are manually distributed and NOT stored in database
# This tool generates a secure admin key that should be given directly to trusted administrators
# Admin keys should never be committed to version control or stored in databases
# Only store admin keys in the .env file of the specific admin's local installation

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# Generate secure random key
function Generate-SecureApiKey {
    param([int]$Length = 64)
    
    # Use cryptographically secure random number generator
    $bytes = New-Object byte[] $Length
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $rng.GetBytes($bytes)
    
    # Convert to base64url-safe string (no padding, URL-safe)
    $key = [Convert]::ToBase64String($bytes)
    $key = $key.Replace('+', '-').Replace('/', '_').Replace('=', '')
    
    # Trim to desired length if needed
    if ($key.Length -gt $Length) {
        $key = $key.Substring(0, $Length)
    }
    
    return $key
}

# Main form
$form = New-Object System.Windows.Forms.Form
$form.Text = "Generate Secure Admin API Key"
$form.Size = New-Object System.Drawing.Size(600, 400)
$form.StartPosition = "CenterScreen"
$form.FormBorderStyle = "FixedDialog"
$form.MaximizeBox = $false
$form.MinimizeBox = $false

# Title
$titleLabel = New-Object System.Windows.Forms.Label
$titleLabel.Text = "Secure Admin API Key Generator"
$titleLabel.Font = New-Object System.Drawing.Font("Segoe UI", 14, [System.Drawing.FontStyle]::Bold)
$titleLabel.AutoSize = $true
$titleLabel.Location = New-Object System.Drawing.Point(20, 20)
$form.Controls.Add($titleLabel)

# Info label
$infoLabel = New-Object System.Windows.Forms.Label
$infoLabel.Text = "This will generate a cryptographically secure random API key for admin access.`n`nIMPORTANT: Admin keys are manually distributed to trusted administrators only.`nThey are NOT stored in databases - only in the admin's local .env file."
$infoLabel.AutoSize = $true
$infoLabel.Location = New-Object System.Drawing.Point(20, 60)
$infoLabel.Width = 550
$infoLabel.Height = 60
$form.Controls.Add($infoLabel)

# Key length label
$lengthLabel = New-Object System.Windows.Forms.Label
$lengthLabel.Text = "Key Length:"
$lengthLabel.AutoSize = $true
$lengthLabel.Location = New-Object System.Drawing.Point(20, 100)
$form.Controls.Add($lengthLabel)

# Key length combo
$lengthCombo = New-Object System.Windows.Forms.ComboBox
$lengthCombo.Location = New-Object System.Drawing.Point(100, 98)
$lengthCombo.Size = New-Object System.Drawing.Size(100, 25)
$lengthCombo.DropDownStyle = "DropDownList"
$lengthCombo.Items.AddRange(@("32", "48", "64", "96", "128"))
$lengthCombo.SelectedIndex = 2  # Default to 64
$form.Controls.Add($lengthCombo)

# Generated key label
$keyLabel = New-Object System.Windows.Forms.Label
$keyLabel.Text = "Generated API Key:"
$keyLabel.AutoSize = $true
$keyLabel.Location = New-Object System.Drawing.Point(20, 140)
$form.Controls.Add($keyLabel)

# Generated key textbox
$keyTextBox = New-Object System.Windows.Forms.TextBox
$keyTextBox.Location = New-Object System.Drawing.Point(20, 165)
$keyTextBox.Size = New-Object System.Drawing.Size(540, 100)
$keyTextBox.Multiline = $true
$keyTextBox.ReadOnly = $true
$keyTextBox.Font = New-Object System.Drawing.Font("Consolas", 10)
$keyTextBox.ScrollBars = "Vertical"
$form.Controls.Add($keyTextBox)

# Security info
$securityLabel = New-Object System.Windows.Forms.Label
$securityLabel.Text = "Security Features:`n• Cryptographically secure random generation`n• Base64url encoding (URL-safe)`n• No predictable patterns`n• Suitable for production use"
$securityLabel.AutoSize = $true
$securityLabel.Location = New-Object System.Drawing.Point(20, 280)
$securityLabel.Width = 540
$form.Controls.Add($securityLabel)

# Buttons
$generateButton = New-Object System.Windows.Forms.Button
$generateButton.Text = "Generate New Key"
$generateButton.Size = New-Object System.Drawing.Size(150, 35)
$generateButton.Location = New-Object System.Drawing.Point(20, 350)
$form.Controls.Add($generateButton)

$copyButton = New-Object System.Windows.Forms.Button
$copyButton.Text = "Copy to Clipboard"
$copyButton.Size = New-Object System.Drawing.Size(150, 35)
$copyButton.Location = New-Object System.Drawing.Point(180, 350)
$copyButton.Enabled = $false
$form.Controls.Add($copyButton)

$saveButton = New-Object System.Windows.Forms.Button
$saveButton.Text = "Save to .env"
$saveButton.Size = New-Object System.Drawing.Size(150, 35)
$saveButton.Location = New-Object System.Drawing.Point(340, 350)
$saveButton.Enabled = $false
$form.Controls.Add($saveButton)

$closeButton = New-Object System.Windows.Forms.Button
$closeButton.Text = "Close"
$closeButton.Size = New-Object System.Drawing.Size(100, 35)
$closeButton.Location = New-Object System.Drawing.Point(500, 350)
$form.Controls.Add($closeButton)

# Generate key function
function Generate-Key {
    $length = [int]$lengthCombo.SelectedItem
    $key = Generate-SecureApiKey -Length $length
    $keyTextBox.Text = $key
    $copyButton.Enabled = $true
    $saveButton.Enabled = $true
}

# Button handlers
$generateButton.Add_Click({
    Generate-Key
    [System.Windows.Forms.MessageBox]::Show(
        "New secure API key generated!`n`nRemember to:`n1. Save it to .env file`n2. Store it securely`n3. Never commit it to git",
        "Key Generated",
        "OK",
        "Information"
    ) | Out-Null
})

$copyButton.Add_Click({
    if ($keyTextBox.Text -ne "") {
        [System.Windows.Forms.Clipboard]::SetText($keyTextBox.Text)
        [System.Windows.Forms.MessageBox]::Show(
            "API key copied to clipboard!",
            "Copied",
            "OK",
            "Information"
        ) | Out-Null
    }
})

$saveButton.Add_Click({
    if ($keyTextBox.Text -eq "") {
        [System.Windows.Forms.MessageBox]::Show(
            "Please generate a key first!",
            "No Key",
            "OK",
            "Warning"
        ) | Out-Null
        return
    }
    
    $key = $keyTextBox.Text
    
    # Check if .env exists (relative to project root)
    $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
    $projectRoot = Split-Path -Parent (Split-Path -Parent $scriptDir)
    $envPath = Join-Path $projectRoot ".env"
    
    if (-not (Test-Path $envPath)) {
        $result = [System.Windows.Forms.MessageBox]::Show(
            ".env file not found. Would you like to create it?",
            ".env Not Found",
            "YesNo",
            "Question"
        )
        if ($result -eq "No") {
            return
        }
    }
    
    # Read .env file
    $envContent = ""
    if (Test-Path $envPath) {
        $envContent = Get-Content $envPath -Raw
    }
    
    # Update or add ADMIN_API_KEYS
    if ($envContent -match "ADMIN_API_KEYS\s*=") {
        # Replace existing ADMIN_API_KEYS line (handles with or without quotes, comments, etc.)
        $envContent = $envContent -replace "ADMIN_API_KEYS\s*=.*", "ADMIN_API_KEYS=$key"
    } else {
        if ($envContent -and -not $envContent.EndsWith("`n") -and -not $envContent.EndsWith("`r`n")) {
            $envContent += "`n"
        }
        $envContent += "`n# Admin API Keys (comma-separated for multiple keys)`nADMIN_API_KEYS=$key`n"
    }
    
    # Write back
    Set-Content -Path $envPath -Value $envContent -NoNewline
    
    [System.Windows.Forms.MessageBox]::Show(
        "Admin API key saved to .env file!`n`nKey: $key`n`nCRITICAL SECURITY:`n• Admin keys are NOT stored in database`n• Only give this key to trusted administrators`n• Keep this key secret and secure`n• Never commit .env to git`n• Store it in password manager or secure location`n• Use it in the admin analytics page`n`nThis key provides full admin access - protect it!",
        "Key Saved - Security Warning",
        "OK",
        "Warning"
    ) | Out-Null
})

$closeButton.Add_Click({
    $form.Close()
})

# Generate initial key
Generate-Key

# Show form
[void]$form.ShowDialog()

