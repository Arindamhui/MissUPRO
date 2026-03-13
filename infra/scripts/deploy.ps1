Param(
  [string]$Tag = "latest"
)

$ErrorActionPreference = "Stop"

Write-Host "Pulling latest images for tag: $Tag"
docker pull "ghcr.io/<owner>/<repo>/api:$Tag"
docker pull "ghcr.io/<owner>/<repo>/web:$Tag"

Write-Host "Starting application stack"
Push-Location "$PSScriptRoot\..\docker"
docker compose up -d
Pop-Location

Write-Host "Deployment finished"
