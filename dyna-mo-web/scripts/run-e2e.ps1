param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$PlaywrightArgs
)

$ErrorActionPreference = "Stop"
$baseUrl = "http://127.0.0.1:3000"
$server = $null
$startedAt = Get-Date

try {
  $server = Start-Process `
    -FilePath "cmd.exe" `
    -ArgumentList "/c", "corepack pnpm dev" `
    -PassThru `
    -WindowStyle Hidden

  $deadline = (Get-Date).AddSeconds(120)
  while ((Get-Date) -lt $deadline) {
    try {
      $response = Invoke-WebRequest -Uri $baseUrl -UseBasicParsing -TimeoutSec 3
      if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
        break
      }
    } catch {
      Start-Sleep -Milliseconds 500
    }
  }

  if ((Get-Date) -ge $deadline) {
    throw "Timed out waiting for $baseUrl"
  }

  & corepack pnpm exec playwright test @PlaywrightArgs
  exit $LASTEXITCODE
} finally {
  if ($null -ne $server -and -not $server.HasExited) {
    Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue
  }
  Get-Process node -ErrorAction SilentlyContinue |
    Where-Object { $_.Path -eq "C:\Program Files\nodejs\node.exe" -and $_.StartTime -ge $startedAt } |
    Stop-Process -Force -ErrorAction SilentlyContinue
}
