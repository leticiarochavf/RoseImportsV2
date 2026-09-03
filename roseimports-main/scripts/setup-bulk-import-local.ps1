$ErrorActionPreference = "Stop"

if (-not (Get-Command docker -ErrorAction SilentlyContinue) -and
    -not (Get-Command podman -ErrorAction SilentlyContinue)) {
  throw "Docker Desktop ou Podman precisa estar instalado, em execução e disponível no PATH."
}

& npx.cmd supabase start
if ($LASTEXITCODE -ne 0) {
  throw "Não foi possível iniciar o Supabase local."
}

& npx.cmd supabase migration up --local
if ($LASTEXITCODE -ne 0) {
  throw "Não foi possível aplicar as migrations no Supabase local."
}

$statusLines = & npx.cmd supabase status -o env
if ($LASTEXITCODE -ne 0) {
  throw "Não foi possível ler as credenciais do Supabase local."
}

$status = @{}
foreach ($line in $statusLines) {
  if ($line -match '^([A-Z_]+)="?(.*?)"?$') {
    $status[$matches[1]] = $matches[2].TrimEnd('"')
  }
}

$apiUrl = $status["API_URL"]
$anonKey = $status["ANON_KEY"]
$serviceRoleKey = $status["SERVICE_ROLE_KEY"]
$databaseUrl = $status["DB_URL"]

if (-not $apiUrl -or -not $anonKey -or -not $serviceRoleKey -or -not $databaseUrl) {
  throw "O Supabase local não retornou todas as credenciais necessárias."
}

$hostname = ([Uri]$apiUrl).Host
if ($hostname -notin @("127.0.0.1", "localhost")) {
  throw "Recusado: o ambiente gerado não aponta para localhost."
}

$environmentPath = Join-Path $PSScriptRoot "..\.env.development.local"
@(
  "NEXT_PUBLIC_SUPABASE_URL=$apiUrl"
  "NEXT_PUBLIC_SUPABASE_ANON_KEY=$anonKey"
  "SUPABASE_SERVICE_ROLE_KEY=$serviceRoleKey"
  "SUPABASE_DB_URL=$databaseUrl"
) | Set-Content -LiteralPath $environmentPath -Encoding utf8

Write-Output "Supabase local preparado. Credenciais gravadas em .env.development.local."
Write-Output "O arquivo .env.local principal não foi alterado."
Write-Output "Próximos comandos: npm run test:bulk-pgtap; npm run test:bulk-local; npm run dev:bulk-local"
