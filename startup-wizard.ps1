# Guard - Standard Windows Installer Wizard
# Traditional installer interface matching Windows standards

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# Main form
$form = New-Object System.Windows.Forms.Form
$form.Text = "Guard - Setup Wizard"
$form.Size = New-Object System.Drawing.Size(620, 520)
$form.StartPosition = "CenterScreen"
$form.FormBorderStyle = "FixedDialog"
$form.MaximizeBox = $false
$form.MinimizeBox = $false
$form.TopMost = $true
$form.BackColor = [System.Drawing.Color]::FromArgb(250, 250, 250)
$form.Padding = New-Object System.Windows.Forms.Padding(0)

# Header panel (like standard installers) - with gradient effect
$headerPanel = New-Object System.Windows.Forms.Panel
$headerPanel.Dock = [System.Windows.Forms.DockStyle]::Top
$headerPanel.Height = 95
$headerPanel.BackColor = [System.Drawing.Color]::FromArgb(0, 120, 215)  # Blue header
$headerPanel.Padding = New-Object System.Windows.Forms.Padding(0, 0, 0, 1)
$form.Controls.Add($headerPanel)

# Title in header
$titleLabel = New-Object System.Windows.Forms.Label
$titleLabel.Text = "Guard Setup"
$titleLabel.Font = New-Object System.Drawing.Font("Segoe UI", 18, [System.Drawing.FontStyle]::Bold)
$titleLabel.AutoSize = $true
$titleLabel.Location = New-Object System.Drawing.Point(20, 20)
$titleLabel.ForeColor = [System.Drawing.Color]::White
$headerPanel.Controls.Add($titleLabel)

# Step label in header
$stepLabel = New-Object System.Windows.Forms.Label
$stepLabel.Text = "Welcome to the Guard Setup Wizard"
$stepLabel.AutoSize = $true
$stepLabel.Location = New-Object System.Drawing.Point(20, 58)
$stepLabel.ForeColor = [System.Drawing.Color]::FromArgb(220, 220, 255)  # Light blue text
$stepLabel.Font = New-Object System.Drawing.Font("Segoe UI", 9)
$headerPanel.Controls.Add($stepLabel)

# Main content area
$contentPanel = New-Object System.Windows.Forms.Panel
$contentPanel.Dock = [System.Windows.Forms.DockStyle]::Fill
$contentPanel.BackColor = [System.Drawing.Color]::White
$contentPanel.Padding = New-Object System.Windows.Forms.Padding(0, 5, 0, 0)
$form.Controls.Add($contentPanel)

# Welcome text
$welcomeText = New-Object System.Windows.Forms.Label
$welcomeText.Text = "This wizard will guide you through the installation of Guard.`n`nClick Next to continue."
$welcomeText.AutoSize = $false
$welcomeText.Location = New-Object System.Drawing.Point(20, 25)
$welcomeText.Size = New-Object System.Drawing.Size(560, 120)
$welcomeText.Font = New-Object System.Drawing.Font("Segoe UI", 10)
$welcomeText.ForeColor = [System.Drawing.Color]::FromArgb(50, 50, 50)
$contentPanel.Controls.Add($welcomeText)

# Component list container (box with border) - centered in content area
# Form: 520px, Header: 95px, Footer: 100px, Content: ~325px
# Box height: 240px, positioned lower in content area for better centering
$componentListContainer = New-Object System.Windows.Forms.Panel
$componentListContainer.Location = New-Object System.Drawing.Point(20, 120)
$componentListContainer.Size = New-Object System.Drawing.Size(560, 240)
$componentListContainer.Anchor = [System.Windows.Forms.AnchorStyles]::Top -bor [System.Windows.Forms.AnchorStyles]::Bottom -bor [System.Windows.Forms.AnchorStyles]::Left -bor [System.Windows.Forms.AnchorStyles]::Right
$componentListContainer.BorderStyle = [System.Windows.Forms.BorderStyle]::FixedSingle
$componentListContainer.BackColor = [System.Drawing.Color]::White
$componentListContainer.Visible = $false
$contentPanel.Controls.Add($componentListContainer)
$componentListContainer.BringToFront()

# Component list (for installation steps)
$componentList = New-Object System.Windows.Forms.ListView
$componentList.Location = New-Object System.Drawing.Point(0, 0)
$componentList.Size = New-Object System.Drawing.Size(558, 238)
$componentList.View = "Details"
$componentList.FullRowSelect = $true
$componentList.GridLines = $false
$componentList.Anchor = [System.Windows.Forms.AnchorStyles]::Top -bor [System.Windows.Forms.AnchorStyles]::Bottom -bor [System.Windows.Forms.AnchorStyles]::Left -bor [System.Windows.Forms.AnchorStyles]::Right
$componentList.HeaderStyle = "Nonclickable"
$componentList.BorderStyle = [System.Windows.Forms.BorderStyle]::None
$componentList.Font = New-Object System.Drawing.Font("Segoe UI", 9)
$componentList.BackColor = [System.Drawing.Color]::FromArgb(252, 252, 252)
$componentList.Columns.Add("Component", 400) | Out-Null
$componentList.Columns.Add("Status", 150) | Out-Null
$componentListContainer.Controls.Add($componentList)

# Status text box (for detailed logs)
$statusTextBox = New-Object System.Windows.Forms.TextBox
$statusTextBox.Multiline = $true
$statusTextBox.ReadOnly = $true
$statusTextBox.ScrollBars = "Vertical"
$statusTextBox.Location = New-Object System.Drawing.Point(20, 25)
$statusTextBox.Size = New-Object System.Drawing.Size(560, 275)
$statusTextBox.Font = New-Object System.Drawing.Font("Consolas", 9)
$statusTextBox.Visible = $false
$contentPanel.Controls.Add($statusTextBox)

# Footer panel
$footerPanel = New-Object System.Windows.Forms.Panel
$footerPanel.Dock = [System.Windows.Forms.DockStyle]::Bottom
$footerPanel.Height = 100
$footerPanel.BackColor = [System.Drawing.Color]::FromArgb(250, 250, 250)
$footerPanel.Padding = New-Object System.Windows.Forms.Padding(0, 1, 0, 0)
$form.Controls.Add($footerPanel)

# Status text in footer
$statusText = New-Object System.Windows.Forms.Label
$statusText.Text = "Ready to install."
$statusText.AutoSize = $true
$statusText.Location = New-Object System.Drawing.Point(20, 12)
$statusText.Font = New-Object System.Drawing.Font("Segoe UI", 9)
$statusText.ForeColor = [System.Drawing.Color]::FromArgb(60, 60, 60)
$footerPanel.Controls.Add($statusText)

# Progress bar
$progressBar = New-Object System.Windows.Forms.ProgressBar
$progressBar.Location = New-Object System.Drawing.Point(20, 37)
$progressBar.Size = New-Object System.Drawing.Size(560, 20)
$progressBar.Style = "Continuous"
$progressBar.Visible = $false
$progressBar.Anchor = [System.Windows.Forms.AnchorStyles]::Left -bor [System.Windows.Forms.AnchorStyles]::Right -bor [System.Windows.Forms.AnchorStyles]::Top
$footerPanel.Controls.Add($progressBar)

# Buttons - positioned from right edge with proper spacing (standard Windows installer style)
# Standard button size: 80x26, spacing: 10px between buttons, 20px from right edge
$cancelButton = New-Object System.Windows.Forms.Button
$cancelButton.Text = "Cancel"
$cancelButton.Size = New-Object System.Drawing.Size(80, 26)
$cancelButton.Location = New-Object System.Drawing.Point(510, 65)
$cancelButton.Anchor = [System.Windows.Forms.AnchorStyles]::Bottom -bor [System.Windows.Forms.AnchorStyles]::Right
$cancelButton.UseVisualStyleBackColor = $true
$cancelButton.FlatStyle = [System.Windows.Forms.FlatStyle]::System
$cancelButton.Font = New-Object System.Drawing.Font("Segoe UI", 9)
$footerPanel.Controls.Add($cancelButton)

$nextButton = New-Object System.Windows.Forms.Button
$nextButton.Text = "Next >"
$nextButton.Size = New-Object System.Drawing.Size(80, 26)
$nextButton.Location = New-Object System.Drawing.Point(420, 65)
$nextButton.TabIndex = 0
$nextButton.Anchor = [System.Windows.Forms.AnchorStyles]::Bottom -bor [System.Windows.Forms.AnchorStyles]::Right
$nextButton.BackColor = [System.Drawing.Color]::FromArgb(0, 120, 215)  # Blue button
$nextButton.ForeColor = [System.Drawing.Color]::White
$nextButton.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
$nextButton.FlatAppearance.BorderSize = 0
$nextButton.FlatAppearance.MouseOverBackColor = [System.Drawing.Color]::FromArgb(0, 102, 204)
$nextButton.FlatAppearance.MouseDownBackColor = [System.Drawing.Color]::FromArgb(0, 84, 153)
$nextButton.UseVisualStyleBackColor = $false
$nextButton.Font = New-Object System.Drawing.Font("Segoe UI", 9, [System.Drawing.FontStyle]::Bold)
$footerPanel.Controls.Add($nextButton)

$backButton = New-Object System.Windows.Forms.Button
$backButton.Text = "< Previous"
$backButton.Size = New-Object System.Drawing.Size(80, 26)
$backButton.Location = New-Object System.Drawing.Point(330, 65)
$backButton.Enabled = $false
$backButton.Anchor = [System.Windows.Forms.AnchorStyles]::Bottom -bor [System.Windows.Forms.AnchorStyles]::Right
$backButton.UseVisualStyleBackColor = $true
$backButton.FlatStyle = [System.Windows.Forms.FlatStyle]::System
$backButton.Font = New-Object System.Drawing.Font("Segoe UI", 9)
$footerPanel.Controls.Add($backButton)

# Terms acceptance checkbox
$termsCheckbox = New-Object System.Windows.Forms.CheckBox
$termsCheckbox.Text = "I accept the terms and conditions and grant access to check system requirements"
$termsCheckbox.Location = New-Object System.Drawing.Point(20, 165)
$termsCheckbox.Size = New-Object System.Drawing.Size(560, 25)
$termsCheckbox.Font = New-Object System.Drawing.Font("Segoe UI", 9)
$termsCheckbox.ForeColor = [System.Drawing.Color]::FromArgb(50, 50, 50)
$termsCheckbox.Visible = $false
$contentPanel.Controls.Add($termsCheckbox)

# Terms text box
$termsTextBox = New-Object System.Windows.Forms.RichTextBox
$termsTextBox.Location = New-Object System.Drawing.Point(20, 25)
$termsTextBox.Size = New-Object System.Drawing.Size(560, 130)
$termsTextBox.ReadOnly = $true
$termsTextBox.BackColor = [System.Drawing.Color]::FromArgb(252, 252, 252)
$termsTextBox.BorderStyle = [System.Windows.Forms.BorderStyle]::FixedSingle
$termsTextBox.Font = New-Object System.Drawing.Font("Segoe UI", 9)
$termsTextBox.Visible = $false
$contentPanel.Controls.Add($termsTextBox)

# State
$currentStep = 0
$totalSteps = 5
$isFirstRun = $false
$dockerInstalled = $false
$dockerRunning = $false
$servicesRunning = $false
$termsAccepted = $false

# Check if first run (need to create .env)
function Check-FirstRun {
    $scriptDir = Get-Location | Select-Object -ExpandProperty Path
    $envFile = Join-Path $scriptDir ".env"
    
    if (-not (Test-Path $envFile)) {
        $script:isFirstRun = $true
        $script:totalSteps = 6
    } else {
        $script:isFirstRun = $false
        $script:totalSteps = 5
    }
    
    Write-Host "Check-FirstRun: .env exists = $(Test-Path $envFile), isFirstRun = $script:isFirstRun, totalSteps = $script:totalSteps"
}

# Add component to list
function Add-Component {
    param([string]$name, [string]$status, [string]$icon = "pending")
    
    $item = New-Object System.Windows.Forms.ListViewItem($name)
    $item.SubItems.Add($status) | Out-Null
    
    if ($status -eq "Installed" -or $status -eq "Running") {
        $item.ForeColor = [System.Drawing.Color]::Green
    } elseif ($status -eq "Failed" -or $status -eq "Stopped") {
        $item.ForeColor = [System.Drawing.Color]::Red
    } elseif ($status -eq "Installing..." -or $status -eq "Starting...") {
        $item.ForeColor = [System.Drawing.Color]::Blue
    }
    
    $componentList.Items.Add($item) | Out-Null
    $form.Refresh()
}

# Update component status
function Update-Component {
    param([string]$name, [string]$status)
    
    foreach ($item in $componentList.Items) {
        if ($item.Text -eq $name) {
            $item.SubItems[1].Text = $status
            if ($status -match "\[OK\]" -or $status -match "Installed" -or $status -match "Running" -or $status -match "Found" -or $status -match "Available") {
                $item.ForeColor = [System.Drawing.Color]::Green
            } elseif ($status -match "\[FAIL\]" -or $status -match "Failed" -or $status -match "Stopped" -or $status -match "Not Installed" -or $status -match "Not Available") {
                $item.ForeColor = [System.Drawing.Color]::Red
            } elseif ($status -match "\[INFO\]") {
                $item.ForeColor = [System.Drawing.Color]::DarkBlue
            } elseif ($status -match "Pending") {
                $item.ForeColor = [System.Drawing.Color]::Gray
            } elseif ($status -match "Checking" -or $status -match "Installing" -or $status -match "Starting") {
                $item.ForeColor = [System.Drawing.Color]::Blue
            }
            $item.EnsureVisible()
            break
        }
    }
    $form.Refresh()
}

# Add status message
function Add-StatusMessage {
    param([string]$message)
    
    if ($statusTextBox.Visible) {
        $timestamp = Get-Date -Format "HH:mm:ss"
        $statusTextBox.AppendText("[$timestamp] $message`r`n")
        $statusTextBox.SelectionStart = $statusTextBox.Text.Length
        $statusTextBox.ScrollToCaret()
        $form.Refresh()
    }
}

# Step 0: Welcome
function Show-WelcomeStep {
    $stepLabel.Text = "Welcome to the Guard Setup Wizard"
    $statusText.Text = "Ready to install."
    $welcomeText.Visible = $false
    $componentListContainer.Visible = $true
    $statusTextBox.Visible = $false
    $progressBar.Visible = $false
    $termsTextBox.Visible = $false
    $termsCheckbox.Visible = $false
    
    # Clear and populate component list with welcome info
    $componentList.Items.Clear()
    $componentList.BeginUpdate()
    
    Add-Component "Welcome" "Getting started..."
    Add-Component "Terms and Conditions" "Will review in next step"
    Add-Component "Prerequisites Check" "Will check in next step"
    Add-Component "Configuration Setup" "Will configure in next step"
    
    $componentList.EndUpdate()
    
    # Update components
    Start-Sleep -Milliseconds 300
    Update-Component "Welcome" "[OK] Welcome to Guard Setup"
    Start-Sleep -Milliseconds 200
    Update-Component "Terms and Conditions" "[INFO] Review required"
    Start-Sleep -Milliseconds 200
    Update-Component "Prerequisites Check" "[INFO] Will check Docker"
    Start-Sleep -Milliseconds 200
    Update-Component "Configuration Setup" "[INFO] Will create .env file"
    
    $backButton.Enabled = $false
    $nextButton.Enabled = $true
    $nextButton.Text = "Next >"
    $nextButton.Size = New-Object System.Drawing.Size(80, 26)
    $nextButton.Location = New-Object System.Drawing.Point(420, 65)
}

# Step 1: Terms and Conditions
function Show-TermsStep {
    $stepLabel.Text = "Step 1 of $totalSteps : Terms and Conditions"
    $statusText.Text = "Please read and accept the terms to continue."
    $welcomeText.Visible = $false
    $componentListContainer.Visible = $true
    $statusTextBox.Visible = $false
    $progressBar.Visible = $false
    $termsTextBox.Visible = $false
    $termsCheckbox.Visible = $false
    
    # Clear and populate component list with terms
    $componentList.Items.Clear()
    $componentList.BeginUpdate()
    
    Add-Component "System Access" "Reviewing terms..."
    Add-Component "Docker Desktop Check" "Reviewing terms..."
    Add-Component "Docker Service Check" "Reviewing terms..."
    Add-Component "Configuration Access" "Reviewing terms..."
    
    $componentList.EndUpdate()
    
    # Update component list to show terms acceptance
    Start-Sleep -Milliseconds 300
    Update-Component "System Access" "[INFO] Read terms above"
    Start-Sleep -Milliseconds 200
    Update-Component "Docker Desktop Check" "[INFO] Will check in next step"
    Start-Sleep -Milliseconds 200
    Update-Component "Docker Service Check" "[INFO] Will check in next step"
    Start-Sleep -Milliseconds 200
    if ($script:termsAccepted) {
        Update-Component "Configuration Access" "[OK] Terms Accepted"
    } else {
        Update-Component "Configuration Access" "[WARN] Please accept terms"
    }
    
    # Add terms checkbox below the component list
    $termsCheckbox.Checked = $script:termsAccepted
    $termsCheckbox.Location = New-Object System.Drawing.Point(20, 365)
    $termsCheckbox.Visible = $true
    
    $backButton.Enabled = $true
    $nextButton.Enabled = $script:termsAccepted
    $nextButton.Text = "Next >"
    $nextButton.Size = New-Object System.Drawing.Size(80, 26)
    $nextButton.Location = New-Object System.Drawing.Point(420, 65)
    
    # Set terms text
    $termsText = "TERMS AND CONDITIONS`n`n" +
                 "By proceeding with the installation and setup of Guard, you agree to the following:`n`n" +
                 "1. SYSTEM ACCESS`n" +
                 "   - This application requires access to check system requirements including:`n" +
                 "     * Docker Desktop installation status`n" +
                 "     * Docker service status`n" +
                 "     * System resources and ports`n" +
                 "   - No personal data will be collected or transmitted without your explicit consent.`n`n" +
                 "2. SOFTWARE REQUIREMENTS`n" +
                 "   - Docker Desktop must be installed and running`n" +
                 "   - Sufficient system resources (RAM, disk space) are required`n" +
                 "   - Network access may be required for certain features`n`n" +
                 "3. DATA AND PRIVACY`n" +
                 "   - All data remains on your local machine`n" +
                 "   - No data is transmitted to external servers without your explicit configuration`n" +
                 "   - You are responsible for maintaining backups of your data`n`n" +
                 "4. LIMITATION OF LIABILITY`n" +
                 "   - This software is provided `"as is`" without warranty`n" +
                 "   - You are responsible for ensuring compliance with your organization's policies`n`n" +
                 "5. ACCEPTANCE`n" +
                 "   - By checking the box below, you acknowledge that you have read, understood, and agree to these terms.`n" +
                 "   - You grant permission for the application to check system requirements as described above.`n`n" +
                 "If you do not agree to these terms, please cancel the installation."
    
    $termsTextBox.Text = $termsText
    $termsTextBox.SelectionStart = 0
    $termsTextBox.SelectionLength = 0
}

# Step 2: Prerequisites
function Show-PrerequisitesStep {
    $stepLabel.Text = "Step 2 of $totalSteps : Checking Prerequisites"
    $statusText.Text = "Checking system requirements..."
    $welcomeText.Visible = $false
    $componentListContainer.Visible = $true
    $statusTextBox.Visible = $false
    $progressBar.Visible = $true
    $termsTextBox.Visible = $false
    $termsCheckbox.Visible = $false
    $progressBar.Value = 0
    $componentList.Items.Clear()
    $componentList.BeginUpdate()
    
    $backButton.Enabled = $true
    $nextButton.Enabled = $false
    $nextButton.Text = "Next >"
    $nextButton.Size = New-Object System.Drawing.Size(80, 26)
    $nextButton.Location = New-Object System.Drawing.Point(420, 65)
    
    # Add all components first so they're all visible
    Add-Component "Docker Desktop Installation" "Pending..."
    Add-Component "Docker Service Status" "Pending..."
    Add-Component "Docker Compose" "Pending..."
    Add-Component "Configuration File" "Pending..."
    
    $componentList.EndUpdate()
    $form.Refresh()
    [System.Windows.Forms.Application]::DoEvents()
    Start-Sleep -Milliseconds 300
    
    # Check Docker installation
    Update-Component "Docker Desktop Installation" "Checking..."
    $progressBar.Value = 10
    $statusText.Text = "Checking Docker Desktop installation..."
    $form.Refresh()
    [System.Windows.Forms.Application]::DoEvents()
    Start-Sleep -Milliseconds 500
    
    try {
        $dockerPath = Get-Command docker -ErrorAction Stop
        $script:dockerInstalled = $true
        Update-Component "Docker Desktop Installation" "[OK] Installed"
        $progressBar.Value = 25
        $statusText.Text = "Docker Desktop is installed."
        $form.Refresh()
        [System.Windows.Forms.Application]::DoEvents()
        Start-Sleep -Milliseconds 500
    } catch {
        $script:dockerInstalled = $false
        Update-Component "Docker Desktop Installation" "[FAIL] Not Installed"
        $progressBar.Value = 100
        $statusText.Text = "Docker Desktop is not installed. Please install it and run this wizard again."
        $nextButton.Enabled = $true
        $nextButton.Text = "Open Download Page"
        $form.Refresh()
        return
    }
    
    # Check Docker service status
    $nextButton.Enabled = $false  # Keep disabled during checks
    Update-Component "Docker Service Status" "Checking..."
    $progressBar.Value = 40
    $statusText.Text = "Checking Docker service status..."
    $form.Refresh()
    [System.Windows.Forms.Application]::DoEvents()
    Start-Sleep -Milliseconds 500
    
    try {
        $dockerOutput = docker ps 2>&1
        if ($LASTEXITCODE -eq 0) {
            $script:dockerRunning = $true
            Update-Component "Docker Service Status" "[OK] Running"
            $progressBar.Value = 55
            $statusText.Text = "Docker service is running."
            $form.Refresh()
            [System.Windows.Forms.Application]::DoEvents()
            Start-Sleep -Milliseconds 500
        } else {
            throw "Docker not responding"
        }
    } catch {
        $script:dockerRunning = $false
        Update-Component "Docker Service Status" "[FAIL] Stopped"
        $progressBar.Value = 100
        $statusText.Text = "Docker Desktop is not running. Please start it and click Next."
        $nextButton.Enabled = $true
        $form.Refresh()
        return
    }
    
    # Check Docker Compose
    $nextButton.Enabled = $false  # Keep disabled during checks
    Update-Component "Docker Compose" "Checking..."
    $progressBar.Value = 70
    $statusText.Text = "Checking Docker Compose availability..."
    $form.Refresh()
    [System.Windows.Forms.Application]::DoEvents()
    Start-Sleep -Milliseconds 500
    
    try {
        $composeOutput = docker compose version 2>&1
        if ($LASTEXITCODE -eq 0) {
            Update-Component "Docker Compose" "[OK] Available"
            $progressBar.Value = 85
            $statusText.Text = "Docker Compose is available."
            $form.Refresh()
            [System.Windows.Forms.Application]::DoEvents()
            Start-Sleep -Milliseconds 500
        } else {
            throw "Docker Compose not available"
        }
    } catch {
        Update-Component "Docker Compose" "[FAIL] Not Available"
        $progressBar.Value = 100
        $statusText.Text = "Docker Compose is not available. Please update Docker Desktop."
        $nextButton.Enabled = $true
        $form.Refresh()
        return
    }
    
    # Check .env file
    $nextButton.Enabled = $false  # Disable Next button during check
    Update-Component "Configuration File" "Checking..."
    $progressBar.Value = 80
    $statusText.Text = "Checking configuration file..."
    $form.Refresh()
    [System.Windows.Forms.Application]::DoEvents()
    Start-Sleep -Milliseconds 300
    
    try {
        # Use Get-Location to get current directory (more reliable than MyInvocation)
        $scriptDir = Get-Location | Select-Object -ExpandProperty Path
        $envFile = Join-Path $scriptDir ".env"
        $envSampleFile = Join-Path $scriptDir ".env.sample"
        
        $progressBar.Value = 90
        $form.Refresh()
        [System.Windows.Forms.Application]::DoEvents()
        Start-Sleep -Milliseconds 200
        
        if (Test-Path $envFile) {
            Update-Component "Configuration File" "[OK] Found"
            $statusText.Text = "All prerequisites are met. Ready to proceed."
        } else {
            Update-Component "Configuration File" "[WARN] Not Found"
            $statusText.Text = ".env file not found. It will be created in the Configuration step."
        }
    } catch {
        Update-Component "Configuration File" "[FAIL] Error"
        $statusText.Text = "Error checking configuration file: $($_.Exception.Message)"
    }
    
    $progressBar.Value = 100
    $nextButton.Enabled = $true  # Enable Next button only after all checks complete
    $form.Refresh()
}

# Step 3: Configuration (first run only)
function Show-ConfigureStep {
    $stepLabel.Text = "Step 3 of $totalSteps : Setting Up Configuration"
    $statusText.Text = "Setting up your configuration files..."
    $welcomeText.Visible = $false
    $componentListContainer.Visible = $true
    $statusTextBox.Visible = $false
    $progressBar.Visible = $true
    $termsTextBox.Visible = $false
    $termsCheckbox.Visible = $false
    $progressBar.Value = 0
    $componentList.Items.Clear()
    $componentList.BeginUpdate()
    
    $backButton.Enabled = $true
    $nextButton.Enabled = $false
    
    Add-Component ".env Configuration File" "Initializing..."
    Add-Component "API Keys" "Waiting..."
    Add-Component "Environment Variables" "Waiting..."
    
    $componentList.EndUpdate()
    $progressBar.Value = 10
    $statusText.Text = "Preparing to create configuration file..."
    $form.Refresh()
    [System.Windows.Forms.Application]::DoEvents()
    Start-Sleep -Milliseconds 300
    
    $scriptDir = Get-Location | Select-Object -ExpandProperty Path
    $envFile = Join-Path $scriptDir ".env"
    $envSampleFile = Join-Path $scriptDir ".env.sample"
    
    # Note: No need to generate per-user API keys for developers
    # Developers share VERIFIED_API_KEYS from .env.backup (stored in .env, not database)
    
    if (-not (Test-Path $envFile)) {
        # Check for .env.backup first, then .env.sample
        $envBackupFile = Join-Path $scriptDir ".env.backup"
        $templateFile = $null
        
        if (Test-Path $envBackupFile) {
            $templateFile = $envBackupFile
            Update-Component ".env Configuration File" "Copying from backup..."
        } elseif (Test-Path $envSampleFile) {
            $templateFile = $envSampleFile
            Update-Component ".env Configuration File" "Copying template..."
        }
        
        if ($templateFile) {
            $progressBar.Value = 30
            $form.Refresh()
            [System.Windows.Forms.Application]::DoEvents()
            Start-Sleep -Milliseconds 300
            
            # Copy .env.backup directly to .env - keep exact same structure and ALL values
            # This ensures all team members have identical .env files with all variables
            Update-Component ".env Configuration File" "[INFO] Copying all values from .env.backup..."
            $form.Refresh()
            [System.Windows.Forms.Application]::DoEvents()
            Start-Sleep -Milliseconds 200
            
            # Direct file copy - preserves everything exactly (structure, values, comments, spacing)
            Copy-Item $templateFile $envFile -Force
            
            # Verify the copy was successful
            if (Test-Path $envFile) {
                $backupLines = (Get-Content $templateFile).Count
                $envLines = (Get-Content $envFile).Count
                if ($backupLines -eq $envLines) {
                    Update-Component ".env Configuration File" "[OK] Copied from .env.backup ($backupLines lines, all values preserved)"
                } else {
                    Update-Component ".env Configuration File" "[WARN] Copied but line count differs ($backupLines vs $envLines)"
                }
            } else {
                Update-Component ".env Configuration File" "[FAIL] Copy failed"
            }
            Update-Component "API Keys" "[OK] All API keys copied"
            Update-Component "Environment Variables" "[OK] All variables copied (database URLs, API keys, etc.)"
            $progressBar.Value = 70
            $statusText.Text = "Full .env file created! All configuration values (database URLs, API keys, etc.) have been preserved from .env.backup."
            $form.Refresh()
            [System.Windows.Forms.Application]::DoEvents()
            Start-Sleep -Milliseconds 500
            
            # Show info about full config file created
            $result = [System.Windows.Forms.MessageBox]::Show(
                "Full configuration file created for development!`n`n" +
                "WHAT WAS CREATED:`n" +
                "- Complete .env file with all configuration values`n" +
                "- Database connection strings (from .env.backup)`n" +
                "- API keys and service configurations`n" +
                "- VERIFIED_API_KEYS (shared dev key for team)`n`n" +
                "IMPORTANT - DATABASE CONFIGURATION:`n" +
                "- Database URLs (JAWSDB_URL, JAWSDB_NV_URL, JAWSDB_V_URL) are copied from .env.backup`n" +
                "- If database URLs are empty, services will start but database features won't work`n" +
                "- Ensure .env.backup has correct database connection strings before running wizard`n" +
                "- Database connections are NOT automatically created - they must be configured manually`n`n" +
                "SECURITY INFORMATION:`n" +
                "- API keys are stored in .env file (NOT in database)`n" +
                "- All developers/teachers share the same VERIFIED_API_KEYS`n" +
                "- Never commit .env to version control`n" +
                "- Keep .env file secure and local to your machine`n`n" +
                "ADMIN KEYS:`n" +
                "- Admin API keys are manually distributed`n" +
                "- Admin keys are NOT stored in database`n" +
                "- Contact your system administrator if you need admin access`n`n" +
                "Would you like to edit the configuration file now?",
                "Configuration - Full .env Created",
                "YesNo",
                "Information"
            )
            
            if ($result -eq "Yes") {
                Start-Process notepad.exe -ArgumentList $envFile -Wait
            }
            
            $progressBar.Value = 90
        } else {
            # No template file exists - warn user they need .env.backup
            Update-Component ".env Configuration File" "[FAIL] No template found"
            Update-Component "API Keys" "[WARN] Cannot create without .env.backup"
            Update-Component "Environment Variables" "[FAIL] Missing .env.backup file"
            $progressBar.Value = 100
            $statusText.Text = "ERROR: .env.backup file is required!`n`nPlease ensure .env.backup exists in the project root with all required configuration values.`n`nThe wizard cannot create a proper .env file without this template."
            $form.Refresh()
            [System.Windows.Forms.Application]::DoEvents()
            Start-Sleep -Milliseconds 500
            
            [System.Windows.Forms.MessageBox]::Show(
                "Cannot create .env file!`n`nThe .env.backup file is required to create a proper configuration file.`n`nPlease ensure .env.backup exists in the project root with all required values.`n`nContact your team lead if you don't have this file.",
                "Missing Template File",
                "OK",
                "Error"
            ) | Out-Null
            
            $nextButton.Enabled = $false
            return
        }
    } else {
        # .env already exists - validate it matches .env.backup structure
        Update-Component ".env Configuration File" "[OK] Already exists"
        Update-Component "API Keys" "[INFO] Checking structure..."
        Update-Component "Environment Variables" "[INFO] Validating..."
        $progressBar.Value = 75
        $form.Refresh()
        [System.Windows.Forms.Application]::DoEvents()
        Start-Sleep -Milliseconds 300
        
        # Validate existing .env matches .env.backup structure
        $envBackupFile = Join-Path $scriptDir ".env.backup"
        if (Test-Path $envBackupFile) {
            $envContent = Get-Content $envFile -Raw
            $backupContent = Get-Content $envBackupFile -Raw
            
            # Extract variable names from both files
            $backupVars = [regex]::Matches($backupContent, '(?m)^([A-Z_][A-Z0-9_]*)\s*=') | ForEach-Object { $_.Groups[1].Value }
            $envVars = [regex]::Matches($envContent, '(?m)^([A-Z_][A-Z0-9_]*)\s*=') | ForEach-Object { $_.Groups[1].Value }
            
            # Check if structure matches (excluding USER_API_KEY and Persona vars)
            $requiredVars = $backupVars | Where-Object { $_ -ne "USER_API_KEY" -and $_ -ne "VERIFY_PROVIDER" -and $_ -notlike "PERSONA_*" }
            $missingVars = $requiredVars | Where-Object { $envVars -notcontains $_ }
            
            if ($missingVars.Count -eq 0) {
                Update-Component "Environment Variables" "[OK] Structure matches .env.backup"
                $statusText.Text = ".env file exists and structure matches .env.backup."
            } else {
                Update-Component "Environment Variables" "[WARN] Structure differs from .env.backup"
                $statusText.Text = ".env file exists but structure differs. Missing: $($missingVars -join ', ')"
            }
        } else {
            Update-Component "Environment Variables" "[INFO] No .env.backup to compare"
            $statusText.Text = ".env file already exists. Skipping creation."
        }
        
        $form.Refresh()
        [System.Windows.Forms.Application]::DoEvents()
        Start-Sleep -Milliseconds 300
    }
    
    $progressBar.Value = 100
    
    # Configuration complete - .env file has same structure as .env.backup (copied directly)
    if (Test-Path $envFile) {
        if (-not (Test-Path (Join-Path $scriptDir ".env.backup"))) {
            $statusText.Text = "Configuration complete! .env file ready."
        } else {
            $statusText.Text = "Configuration complete! .env file matches .env.backup structure."
        }
    } else {
        $statusText.Text = "Configuration complete. .env file created."
    }
    
    $nextButton.Enabled = $true
    $form.Refresh()
}

# Step 4: Check Services
function Show-CheckServicesStep {
    $stepLabel.Text = "Step 4 of $totalSteps : Checking Services"
    $statusText.Text = "Checking service status..."
    $welcomeText.Visible = $false
    $componentListContainer.Visible = $true
    $statusTextBox.Visible = $false
    $progressBar.Visible = $true
    $progressBar.Value = 0
    $componentList.Items.Clear()
    
    $backButton.Enabled = $true
    $nextButton.Enabled = $false
    
    $services = @("frontend", "api-gateway", "orchestrator", "ai-rag", "cve-ingestor", "etl-nv", "etl-v", "ollama")
    $runningCount = 0
    $totalCount = $services.Count
    
    # Change to project directory
    $scriptDir = Get-Location | Select-Object -ExpandProperty Path
    if (-not (Test-Path $scriptDir)) {
        $scriptDir = Get-Location
    }
    $originalLocation = Get-Location
    Set-Location $scriptDir
    
    foreach ($service in $services) {
        Add-Component $service "Checking..."
        $form.Refresh()
        
        try {
            $status = docker compose ps $service --format "{{.Status}}" 2>&1
            if ($LASTEXITCODE -eq 0 -and $status -match "Up") {
                Update-Component $service "Running"
                $runningCount++
            } else {
                Update-Component $service "Stopped"
            }
        } catch {
            Update-Component $service "Unknown"
        }
        
        $progressBar.Value = [Math]::Min(90, (($services.IndexOf($service) + 1) * 90 / $totalCount))
        $form.Refresh()
    }
    
    # Restore original location
    Set-Location $originalLocation
    
    if ($runningCount -eq $totalCount) {
        $script:servicesRunning = $true
        $statusText.Text = "All services are running."
        $nextButton.Text = "Next >"
        # Reset button size
        $nextButton.Size = New-Object System.Drawing.Size(75, 23)
        $nextButton.Location = New-Object System.Drawing.Point(420, 67)
    } else {
        $script:servicesRunning = $false
        $statusText.Text = "$runningCount of $totalCount services are running."
        $nextButton.Text = "Start Services >"
        # Make button wider for longer text
        $nextButton.Size = New-Object System.Drawing.Size(110, 23)
        $nextButton.Location = New-Object System.Drawing.Point(410, 67)
    }
    
    $progressBar.Value = 100
    $nextButton.Enabled = $true
}

# Step 5: Start Services
function Show-StartServicesStep {
    $stepLabel.Text = "Step 5 of $totalSteps : Starting Services"
    $statusText.Text = "Starting Docker services..."
    $welcomeText.Visible = $false
    $componentListContainer.Visible = $true
    $statusTextBox.Visible = $false
    $progressBar.Visible = $true
    $progressBar.Value = 0
    
    $backButton.Enabled = $false
    $nextButton.Enabled = $false
    $nextButton.Text = "Next >"
    
    $services = @("frontend", "api-gateway", "orchestrator", "ai-rag", "cve-ingestor", "etl-nv", "etl-v", "ollama")
    $componentList.Items.Clear()
    
    foreach ($service in $services) {
        Add-Component $service "Starting..."
    }
    
    $statusText.Text = "Starting Docker Compose services..."
    $progressBar.Value = 25
    $form.Refresh()
    [System.Windows.Forms.Application]::DoEvents()
    
    $scriptDir = Get-Location | Select-Object -ExpandProperty Path
    if (-not (Test-Path $scriptDir)) {
        $scriptDir = Get-Location
    }
    
    # Run docker compose asynchronously using background job
    $statusText.Text = "Starting Docker Compose (this may take a few minutes)..."
    $progressBar.Value = 30
    $form.Refresh()
    [System.Windows.Forms.Application]::DoEvents()
    
    # Run docker compose synchronously but with UI updates
    # Use a simpler approach that actually works
    $statusText.Text = "Running: docker compose up --build -d"
    $form.Refresh()
    [System.Windows.Forms.Application]::DoEvents()
    
    # Run docker compose command using PowerShell's Start-Process for better control
    $progressBar.Value = 40
    $form.Refresh()
    [System.Windows.Forms.Application]::DoEvents()
    
    # Change to project directory
    $originalLocation = Get-Location
    Set-Location $scriptDir
    
    # Run docker compose command - use cmd.exe for better compatibility
    try {
        $statusText.Text = "Executing: docker compose up --build -d"
        $form.Refresh()
        [System.Windows.Forms.Application]::DoEvents()
        
        # Use cmd.exe to run docker compose (handles output better)
        $processInfo = New-Object System.Diagnostics.ProcessStartInfo
        $processInfo.FileName = "cmd.exe"
        $processInfo.Arguments = "/c docker compose up --build -d 2>&1"
        $processInfo.WorkingDirectory = $scriptDir
        $processInfo.UseShellExecute = $false
        $processInfo.RedirectStandardOutput = $true
        $processInfo.RedirectStandardError = $true
        $processInfo.CreateNoWindow = $true
        
        $process = New-Object System.Diagnostics.Process
        $process.StartInfo = $processInfo
        
        # Start process
        $process.Start() | Out-Null
        
        # Read output asynchronously
        $outputBuilder = New-Object System.Text.StringBuilder
        $errorBuilder = New-Object System.Text.StringBuilder
        
        $outputEvent = Register-ObjectEvent -InputObject $process -EventName OutputDataReceived -Action {
            if ($EventArgs.Data) {
                [void]$Event.MessageData.AppendLine($EventArgs.Data)
            }
        } -MessageData $outputBuilder
        
        $errorEvent = Register-ObjectEvent -InputObject $process -EventName ErrorDataReceived -Action {
            if ($EventArgs.Data) {
                [void]$Event.MessageData.AppendLine($EventArgs.Data)
            }
        } -MessageData $errorBuilder
        
        $process.BeginOutputReadLine()
        $process.BeginErrorReadLine()
        
        # Wait for process with UI updates
        $progressBar.Value = 50
        while (-not $process.HasExited) {
            [System.Windows.Forms.Application]::DoEvents()
            Start-Sleep -Milliseconds 200
            if ($progressBar.Value -lt 70) {
                $progressBar.Value += 1
            }
        }
        
        $process.WaitForExit()
        $exitCode = $process.ExitCode
        
        # Clean up events
        Unregister-Event -SourceIdentifier $outputEvent.Name -ErrorAction SilentlyContinue
        Unregister-Event -SourceIdentifier $errorEvent.Name -ErrorAction SilentlyContinue
        
        $output = $outputBuilder.ToString()
        $errorOutput = $errorBuilder.ToString()
        
        # Filter out warnings - they're not actual errors
        $realErrors = ($errorOutput -split "`n" | Where-Object { $_ -notmatch "level=warning" -and $_ -notmatch "variable is not set" -and $_ -notmatch "Defaulting to a blank" -and $_.Trim() -ne "" }) -join "`n"
        
        # If only warnings, treat as success (Docker Compose warnings don't mean failure)
        if ($realErrors -eq "" -and $exitCode -ne 0) {
            # Check if output contains success indicators
            if ($output -match "Creating|Starting|Started|Up|done" -or $output -eq "") {
                $exitCode = 0
            }
        }
        
    } catch {
        $exitCode = 1
        $realErrors = $_.Exception.Message
        $output = ""
    } finally {
        Set-Location $originalLocation
    }
    
    # Update progress while waiting
    $progressBar.Value = 70
    $form.Refresh()
    [System.Windows.Forms.Application]::DoEvents()
    
    if ($exitCode -eq 0 -or ($realErrors -eq "" -and $output -ne "")) {
        $progressBar.Value = 75
        $statusText.Text = "Services started. Verifying..."
        $form.Refresh()
        [System.Windows.Forms.Application]::DoEvents()
        
        Start-Sleep -Seconds 5  # Give services time to start
        
        # Change to project directory for checking
        $originalLocation = Get-Location
        Set-Location $scriptDir
        
        $runningCount = 0
        foreach ($service in $services) {
            try {
                $status = docker compose ps $service --format "{{.Status}}" 2>&1
                if ($LASTEXITCODE -eq 0 -and $status -match "Up") {
                    Update-Component $service "Running"
                    $runningCount++
                } else {
                    Update-Component $service "Stopped"
                }
            } catch {
                Update-Component $service "Unknown"
            }
            [System.Windows.Forms.Application]::DoEvents()
        }
        
        Set-Location $originalLocation
        
        if ($runningCount -eq 8) {
            $script:servicesRunning = $true
            $statusText.Text = "All services are running."
            $nextButton.Text = "Next >"
            $nextButton.Size = New-Object System.Drawing.Size(75, 23)
            $nextButton.Location = New-Object System.Drawing.Point(420, 67)
        } else {
            $script:servicesRunning = $false
            $statusText.Text = "$runningCount of 8 services are running. Some may still be starting..."
            $nextButton.Text = "Next >"
            $nextButton.Size = New-Object System.Drawing.Size(75, 23)
            $nextButton.Location = New-Object System.Drawing.Point(420, 67)
        }
        
        $progressBar.Value = 100
        $nextButton.Enabled = $true
        $backButton.Enabled = $true
    } else {
        # Failed to start
        foreach ($service in $services) {
            Update-Component $service "Failed"
        }
        $statusText.Text = "Failed to start services. Exit code: $exitCode"
        if ($realErrors -and $realErrors.Trim() -ne "") {
            $errorMsg = $realErrors.Substring(0, [Math]::Min(80, $realErrors.Length))
            $statusText.Text += " Error: $errorMsg"
        } else {
            $statusText.Text += " Check Docker logs or try running as administrator."
        }
        $progressBar.Value = 100
        $backButton.Enabled = $true
        $nextButton.Enabled = $true
        $nextButton.Text = "Retry"
        $nextButton.Size = New-Object System.Drawing.Size(75, 23)
        $nextButton.Location = New-Object System.Drawing.Point(420, 67)
    }
}

# Step 6: Complete
function Show-CompleteStep {
    $script:currentStep = 6
    $stepLabel.Text = "Installation Complete"
    $statusText.Text = "Guard is ready to use."
    $welcomeText.Visible = $false
    $componentListContainer.Visible = $true
    $statusTextBox.Visible = $false
    $progressBar.Visible = $false
    $termsTextBox.Visible = $false
    $termsCheckbox.Visible = $false
    
    # Clear and populate component list with completion info
    $componentList.Items.Clear()
    $componentList.BeginUpdate()
    
    Add-Component "Installation" "[OK] Complete"
    Add-Component "Services" "[OK] Running"
    Add-Component "Main Page (Portal)" "[OK] http://localhost:3000 (auto-redirects to /portal)"
    Add-Component "Admin Dashboard" "[OK] http://localhost:3000/admin/analytics"
    
    $componentList.EndUpdate()
    
    $backButton.Enabled = $false
    $nextButton.Text = "Finish"
    $nextButton.Enabled = $true
}

# Navigation
function Update-Step {
    if ($currentStep -eq 0) {
        Show-WelcomeStep
    } elseif ($currentStep -eq 1) {
        Show-TermsStep
    } elseif ($currentStep -eq 2) {
        Show-PrerequisitesStep
    } elseif ($currentStep -eq 3) {
        # Configuration step - always show if we're here
        Show-ConfigureStep
    } elseif ($currentStep -eq 4) {
        Show-CheckServicesStep
    } elseif ($currentStep -eq 5) {
        if (-not $servicesRunning) {
            Show-StartServicesStep
        } else {
            Show-CompleteStep
        }
    } else {
        Show-CompleteStep
    }
}

# Terms checkbox handler
$termsCheckbox.Add_CheckedChanged({
    $script:termsAccepted = $termsCheckbox.Checked
    $nextButton.Enabled = $termsCheckbox.Checked
})

# Button handlers
$nextButton.Add_Click({
    if ($currentStep -eq 0) {
        # Welcome -> Terms
        $script:currentStep = 1
        Update-Step
    } elseif ($currentStep -eq 1) {
        # Terms -> Prerequisites
        if (-not $termsAccepted) {
            return
        }
        $script:currentStep = 2
        Update-Step
    } elseif ($currentStep -eq 2) {
        # Prerequisites -> Configure (if .env doesn't exist) or Check Services
        if ($nextButton.Text -eq "Open Download Page") {
            Start-Process "https://www.docker.com/products/docker-desktop"
            return
        }
        # Check if .env exists - if not, ALWAYS go to Configuration step
        $scriptDir = Get-Location | Select-Object -ExpandProperty Path
        $envFile = Join-Path $scriptDir ".env"
        if (-not (Test-Path $envFile)) {
            # .env doesn't exist - go to Configuration step
            $script:currentStep = 3
            $script:isFirstRun = $true
            $script:totalSteps = 6
        } else {
            # .env exists - skip to Check Services
            $script:currentStep = 4
            $script:isFirstRun = $false
            $script:totalSteps = 5
        }
        Update-Step
    } elseif ($currentStep -eq 3) {
        # Configuration step completed -> Check Services
        $scriptDir = Get-Location | Select-Object -ExpandProperty Path
        $envFile = Join-Path $scriptDir ".env"
        if (Test-Path $envFile) {
            # .env was created, move to Check Services
            $script:currentStep = 4
            Update-Step
        } else {
            # .env still doesn't exist, stay on configuration (shouldn't happen)
            $statusText.Text = "Configuration file creation failed. Please try again."
            return
        }
    } elseif ($currentStep -eq 4) {
        # Check Services -> Start Services (if needed) or Complete
        if (-not $servicesRunning) {
            # Need to start services
            $script:currentStep = 5
            Update-Step
        } else {
            # Services already running, go to complete
            $script:currentStep = 6
            Show-CompleteStep
        }
    } elseif ($currentStep -eq 5) {
        # Start Services -> Complete (or re-check)
        if ($nextButton.Text -eq "Retry") {
            # Retry starting services
            $script:currentStep = 5
            Update-Step
        } elseif ($servicesRunning) {
            # Services are running, show complete
            $script:currentStep = 6
            Show-CompleteStep
        } else {
            # Re-check services after starting
            $script:currentStep = 4
            Update-Step
        }
    } elseif ($currentStep -eq 6) {
        # Complete step - Finish button clicked
        if ($nextButton.Text -eq "Finish") {
            # Ask if user wants to open the frontend
            $result = [System.Windows.Forms.MessageBox]::Show(
                "All services are running!`n`nWould you like to open the Frontend now?",
                "Guard - Ready",
                "YesNo",
                "Question"
            )
            
            if ($result -eq "Yes") {
                Start-Process "http://localhost:3000/portal"
            }
            $form.Close()
        }
    }
})

$backButton.Add_Click({
    if ($currentStep -gt 0) {
        $script:currentStep--
        Update-Step
    }
})

$cancelButton.Add_Click({
    $result = [System.Windows.Forms.MessageBox]::Show(
        "Are you sure you want to cancel the installation?",
        "Cancel Installation",
        "YesNo",
        "Question"
    )
    if ($result -eq "Yes") {
        $form.Close()
    }
})

# Initialize
Check-FirstRun
Update-Step

# Show form
[void]$form.ShowDialog()
