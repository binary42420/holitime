[CmdletBinding(SupportsShouldProcess=$true)]
param(
    [Parameter(Mandatory=$true)]
    [string]$ProjectId,

    [Parameter(Mandatory=$true)]
    [string]$ServiceName,

    [Parameter(Mandatory=$true)]
    [string]$Region,

    [string]$ImageTag = 'latest',

    [switch]$AllowUnauthenticated,

    [string]$CloudBuildConfigFile = 'cloudbuild.yaml',

    [string]$Dockerfile = 'Dockerfile',

    [switch]$DryRun
)

# --- Environment Variables for Next.js Application ---
# IMPORTANT SECURITY NOTE:
# Directly embedding sensitive credentials here is NOT recommended for production.
# Consider using Google Cloud Secret Manager for these values:
# https://cloud.google.com/secret-manager/docs/access-secrets
# If you use Secret Manager, you would update the 'args' section for '--set-env-vars'
# in the cloudbuild.yaml to use '--update-secrets' instead (e.g., SECRET_KEY=projects/PROJECT_NUMBER/secrets/SECRET_NAME/versions/latest)

$EnvVariables = @{
    "NODE_ENV" = "production"
    "NEXT_TELEMETRY_DISABLED" = "1"
    "DATABASE_URL" = "postgres://avnadmin:AVNS_ZM2GXlIMUITHMcxFPcy@holidb-hol619.d.aivencloud.com:12297/defaultdb?sslmode=require"
    "DATABASE_PROVIDER" = "aiven"
    "DATABASE_SSL" = "true"
    "NODE_TLS_REJECT_UNAUTHORIZED" = "0"
    "NEXTAUTH_SECRET" = "holitime-super-secure-secret-key-for-production-2024"
    "NEXTAUTH_URL" = "https://holitime-369017734615.us-central1.run.app"
    "GOOGLE_CLIENT_ID" = "369017734615-d69l9fi2bphahlk815ji447ri2m3qjjp.apps.googleusercontent.com"
    "GOOGLE_CLIENT_SECRET" = "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"
    "JWT_SECRET" = "holitime-jwt-secret-key-for-production-2024"
    "SMTP_HOST" = "smtp.gmail.com"
    "SMTP_PORT" = "587"
    "SMTP_USER" = "ryley92@gmail.com"
    "SMTP_PASS" = "bhxfntiblfatdlep"
    "GOOGLE_AI_API_KEY" = "AIzaSyDb8Qj6GKxUL1I2Stgv1B0gSTDOj0FB6k"
    "GOOGLE_API_KEY" = "AIzaSyAaMQ6qq0iVnyt2w1IERTPwXGrllSLnhZQ"
}

# --- Script Configuration ---
$GCRHostname = "gcr.io" # For Artifact Registry, use e.g. "us-central1-docker.pkg.dev"

# --- Helper Functions ---

function Test-GcloudCli {
    try {
        (gcloud --version | Select-String "Google Cloud SDK").Length -gt 0
    } catch {
        $false
    }
}

function Test-GcloudAuthAndProject {
    try {
        $currentUser = gcloud auth list --filter="status:ACTIVE" --format="value(account)"
        if (-not $currentUser) {
            Write-Warning "Not authenticated to gcloud. Please run 'gcloud auth login'."
            return $false
        }
        Write-Verbose "Authenticated as: $currentUser"

        $currentProject = gcloud config get-value project
        if (-not $currentProject) {
            Write-Warning "No active gcloud project set. Please run 'gcloud config set project $ProjectId' or ensure you're logged into a project."
            return $false
        }
        if ($currentProject -ne $ProjectId) {
            Write-Warning "Current gcloud project '$currentProject' does not match the specified ProjectId '$ProjectId'."
            Write-Warning "Please switch projects using 'gcloud config set project $ProjectId' or ensure the correct project is selected in your environment."
            return $false
        }
        Write-Verbose "Current gcloud project: $currentProject"
        return $true
    } catch {
        Write-Error "Failed to check gcloud authentication or project: $($_.Exception.Message)"
        return $false
    }
}

function Invoke-GcloudCommand {
    param(
        [Parameter(Mandatory=$true)]
        [string[]]$Arguments,
        [Parameter(Mandatory=$false)]
        [string]$ErrorPrompt = "Failed to execute gcloud command.",
        [Parameter(Mandatory=$false)]
        [bool]$NoOutput = $false
    )
    $command = "gcloud"
    Write-Verbose "Executing: $command $($Arguments -join ' ')"

    $processInfo = New-Object System.Diagnostics.ProcessStartInfo
    $processInfo.FileName = $command
    $processInfo.Arguments = ($Arguments -join ' ')
    $processInfo.RedirectStandardOutput = -not $NoOutput
    $processInfo.RedirectStandardError = $true
    $processInfo.UseShellExecute = $false
    $processInfo.CreateNoWindow = $true

    $process = New-Object System.Diagnostics.Process
    $process.StartInfo = $processInfo

    try {
        $process.Start() | Out-Null
        $process.WaitForExit()

        $stdout = $process.StandardOutput.ReadToEnd()
        $stderr = $process.StandardError.ReadToEnd()

        if ($process.ExitCode -ne 0) {
            Write-Error "$ErrorPrompt`nSTDOUT:`n$stdout`nSTDERR:`n$stderr"
            return $false
        }
        if (-not $NoOutput) {
            Write-Host $stdout
        }
        return $true
    } catch {
        Write-Error "Error executing gcloud: $($_.Exception.Message)"
        return $false
    }
}

function Generate-CloudBuildYaml {
    param(
        [Parameter(Mandatory=$true)]
        [string]$ConfigFile,
        [Parameter(Mandatory=$true)]
        [hashtable]$EnvVars,
        [Parameter(Mandatory=$true)]
        [string]$Service,
        [Parameter(Mandatory=$true)]
        [string]$Region,
        [Parameter(Mandatory=$true)]
        [string]$ImageTag,
        [Parameter(Mandatory=$true)]
        [string]$GCRHost,
        [Parameter(Mandatory=$true)]
        [switch]$Unauthenticated
    )

    Write-Verbose "Generating Cloud Build configuration: $ConfigFile"

    # Construct the --set-env-vars string
    $envVarString = ""
    foreach ($key in $EnvVars.Keys) {
        $value = $EnvVars[$key]
        # Escape internal double quotes for YAML string
        $escapedValue = $value -replace '"', '\"'
        $envVarString += "$($key)=$($escapedValue),"
    }
    # Remove trailing comma
    $envVarString = $envVarString.TrimEnd(',')

    # Construct the --allow-unauthenticated flag part
    $authFlag = ""
    if ($Unauthenticated) {
        $authFlag = "`n  - '--allow-unauthenticated'"
    }

    $yamlContent = @"
# This file is dynamically generated by deploy-nextjs-to-cloudrun.ps1
# DO NOT EDIT MANUALLY if you intend to use the script for future deployments.
# To customize, modify the PowerShell script directly.

steps:
- name: '${GCRHost}/cloud-builders/docker'
  id: 'Build and Tag Image'
  args: ['build', '-t', '${GCRHost}/${PROJECT_ID}/${Service}:${ImageTag}', '.']

- name: '${GCRHost}/cloud-builders/docker'
  id: 'Push Image to Registry'
  args: ['push', '${GCRHost}/${PROJECT_ID}/${Service}:${ImageTag}']

- name: '${GCRHost}/cloud-builders/gcloud'
  id: 'Deploy to Cloud Run'
  args:
  - 'run'
  - 'deploy'
  - '${Service}'
  - '--image'
  - '${GCRHost}/${PROJECT_ID}/${Service}:${ImageTag}'
  - '--platform'
  - 'managed'
  - '--region'
  - '${Region}'
  - '--set-env-vars'
  - "$envVarString"$authFlag
  - '--project'
  - '${PROJECT_ID}'

images:
- '${GCRHost}/${PROJECT_ID}/${Service}:${ImageTag}'

substitutions:
  _GCR_HOSTNAME: ${GCRHost}
  _SERVICE_NAME: ${Service}
  _REGION: ${Region}
  _TAG_NAME: '${ImageTag}'
"@

    try {
        $yamlContent | Out-File -FilePath $ConfigFile -Encoding UTF8
        Write-Host "Successfully generated '$ConfigFile'."
        if ($DryRun) {
            Write-Host "`n--- Generated $ConfigFile Content ---"
            Get-Content $ConfigFile
            Write-Host "-------------------------------------`n"
        }
        return $true
    } catch {
        Write-Error "Failed to write '$ConfigFile': $($_.Exception.Message)"
        return $false
    }
}

# --- Main Script Logic ---
function Main {
    Set-StrictMode -Version Latest
    $ErrorActionPreference = 'Stop'

    Write-Host "Starting Next.js to Cloud Run Deployment Script..."

    # 1. Validate gcloud CLI and authentication
    Write-Host "Checking gcloud CLI and authentication..."
    if (-not (Test-GcloudCli)) {
        Write-Error "gcloud CLI is not installed or not in PATH. Please install it from https://cloud.google.com/sdk/docs/install and try again."
        exit 1
    }
    if (-not (Test-GcloudAuthAndProject)) {
        Write-Error "gcloud is not authenticated or not configured for project '$ProjectId'. Please resolve this and try again."
        exit 1
    }

    # 2. Validate Dockerfile existence
    if (-not (Test-Path -Path $Dockerfile -PathType Leaf)) {
        Write-Error "Dockerfile not found at '$Dockerfile'. Please ensure it exists in the current directory."
        Write-Host "A recommended Dockerfile structure can be found in the script's comments or online."
        exit 1
    }
    Write-Host "Dockerfile found: $Dockerfile"

    # 3. Generate cloudbuild.yaml
    if (-not (Generate-CloudBuildYaml -ConfigFile $CloudBuildConfigFile -EnvVars $EnvVariables -Service $ServiceName -Region $Region -ImageTag $ImageTag -GCRHost $GCRHostname -Unauthenticated:$AllowUnauthenticated)) {
        Write-Error "Failed to generate $CloudBuildConfigFile. Aborting."
        exit 1
    }

    if ($DryRun) {
        Write-Warning "Dry run complete. No actual deployment was performed."
        exit 0
    }

    # 4. Confirmation
    if (-not $PSCmdlet.ShouldProcess("Cloud Run service '$ServiceName' in '$Region' for project '$ProjectId'", "Proceed with deployment?", "Confirm Deployment")) {
        Write-Warning "Deployment cancelled by user."
        exit 0
    }

    # 5. Trigger Cloud Build
    Write-Host "`nTriggering Cloud Build for deployment..."
    Write-Host "This may take a few minutes as Cloud Build will build your Docker image and deploy to Cloud Run."

    try {
        $buildArgs = @(
            "builds",
            "submit",
            "--config", $CloudBuildConfigFile,
            ".", # Submit current directory
            "--project", $ProjectId
        )
        $buildResult = Invoke-GcloudCommand -Arguments $buildArgs -ErrorPrompt "Cloud Build submission failed."

        if (-not $buildResult) {
            Write-Error "Cloud Build failed to submit or execute. Check the error message above for details."
            Write-Host "Common issues: Cloud Build API or Cloud Run API not enabled."
            Write-Host "Enable APIs: 'gcloud services enable cloudbuild.googleapis.com run.googleapis.com'"
            Write-Host "Permissions: Ensure Cloud Build service account has permissions to deploy to Cloud Run."
            exit 1
        }

        Write-Host "`nCloud Build initiated successfully!"
        Write-Host "You can monitor the build progress here:"
        Write-Host "https://console.cloud.google.com/cloud-build/builds;region=$Region?project=$ProjectId"

        # Wait for the build to complete and get service URL
        Write-Host "`nWaiting for deployment to complete... (This might take a moment)"
        $getServiceArgs = @(
            "run",
            "services",
            "describe", $ServiceName,
            "--platform", "managed",
            "--region", $Region,
            "--format", "value(status.url)",
            "--project", $ProjectId
        )

        $serviceUrl = ""
        $retries = 30 # Wait up to 5 minutes (30 * 10 seconds)
        for ($i = 0; $i -lt $retries; $i++) {
            $result = Invoke-GcloudCommand -Arguments $getServiceArgs -NoOutput -ErrorAction SilentlyContinue
            if ($result) {
                # Read output from the command, assuming it was echoed
                $serviceUrl = gcloud run services describe $ServiceName --platform managed --region $Region --format="value(status.url)" --project $ProjectId | Out-String | Trim()
                if ($serviceUrl) {
                    break
                }
            }
            Start-Sleep -Seconds 10
            Write-Host "Still waiting for service URL... (attempt $($i+1)/$retries)"
        }

        if (-not $serviceUrl) {
            Write-Warning "Could not retrieve Cloud Run service URL. Check Cloud Run console for status."
        } else {
            Write-Host "`nSuccessfully deployed '$ServiceName' to Cloud Run!"
            Write-Host "Your application is available at: $serviceUrl"
        }

        Write-Host "`nDeployment process completed."

    } catch {
        Write-Error "An unexpected error occurred during Cloud Build or deployment: $($_.Exception.Message)"
        exit 1
    } finally {
        # Clean up dynamically generated cloudbuild.yaml
        if (Test-Path -Path $CloudBuildConfigFile) {
            Write-Verbose "Removing temporary Cloud Build configuration file: $CloudBuildConfigFile"
            Remove-Item -Path $CloudBuildConfigFile -Force
        }
    }
}

# Execute the main function
Main