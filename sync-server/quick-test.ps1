# Kutunza API Quick Test Script
# Usage: .\quick-test.ps1

$API_BASE = "http://localhost:3000"
$API_KEY = "f374535cc03d04c3b2a7e17dfb2aad9a60dbd90f1151c1d7f34245f8c460352d"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "KUTUNZA API QUICK TEST" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Test 1: Health Check
Write-Host "1. Testing Health Check..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "$API_BASE/health"
    Write-Host "✅ Status: $($health.status)" -ForegroundColor Green
    Write-Host "   Database: $($health.checks.database.status)`n" -ForegroundColor Gray
} catch {
    Write-Host "❌ Failed: $($_.Exception.Message)`n" -ForegroundColor Red
}

# Test 2: Platform Login
Write-Host "2. Testing Platform Login..." -ForegroundColor Yellow
try {
    $loginBody = @{
        email = "bamidele.ogunlade@cybercapsec.com"
        password = "Admin@2025"
    } | ConvertTo-Json

    $loginResponse = Invoke-RestMethod -Uri "$API_BASE/api/platform/login" `
        -Method POST `
        -Body $loginBody `
        -ContentType "application/json"

    Write-Host "✅ Login successful!" -ForegroundColor Green
    Write-Host "   Admin: $($loginResponse.admin.email)" -ForegroundColor Gray
    Write-Host "   Role: $($loginResponse.admin.role)" -ForegroundColor Gray
    Write-Host "   Token: $($loginResponse.token.Substring(0,20))...`n" -ForegroundColor Gray
    
    $global:token = $loginResponse.token
} catch {
    Write-Host "❌ Failed: $($_.Exception.Message)`n" -ForegroundColor Red
}

# Test 3: System Metrics
Write-Host "3. Testing System Metrics..." -ForegroundColor Yellow
try {
    $headers = @{ "x-api-key" = $API_KEY }
    $metrics = Invoke-RestMethod -Uri "$API_BASE/api/metrics" -Headers $headers

    Write-Host "✅ Metrics retrieved!" -ForegroundColor Green
    Write-Host "   Companies: $($metrics.metrics.companies.total) ($($metrics.metrics.companies.active) active)" -ForegroundColor Gray
    Write-Host "   Stores: $($metrics.metrics.stores.total)" -ForegroundColor Gray
    Write-Host "   Users: $($metrics.metrics.users.total)`n" -ForegroundColor Gray
} catch {
    Write-Host "❌ Failed: $($_.Exception.Message)`n" -ForegroundColor Red
}

# Test 4: Critical Alerts
Write-Host "4. Testing Critical Alerts..." -ForegroundColor Yellow
try {
    $headers = @{ "x-api-key" = $API_KEY }
    $alerts = Invoke-RestMethod -Uri "$API_BASE/api/alerts" -Headers $headers

    Write-Host "✅ Alerts retrieved!" -ForegroundColor Green
    Write-Host "   Total alerts: $($alerts.alertCount)" -ForegroundColor Gray
    
    if ($alerts.alerts.Count -gt 0) {
        foreach ($alert in $alerts.alerts) {
            Write-Host "   - [$($alert.severity)] $($alert.message)" -ForegroundColor Yellow
        }
    }
    Write-Host ""
} catch {
    Write-Host "❌ Failed: $($_.Exception.Message)`n" -ForegroundColor Red
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Test Complete!" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan

# Interactive Menu
Write-Host "What would you like to do next?" -ForegroundColor Yellow
Write-Host "1. Register a new company"
Write-Host "2. Get company details (requires company ID)"
Write-Host "3. Exit`n"

$choice = Read-Host "Enter choice (1-3)"

switch ($choice) {
    "1" {
        Write-Host "`nRegistering new company..." -ForegroundColor Yellow
        
        $companyName = Read-Host "Company Name"
        $companyEmail = Read-Host "Company Email"
        $adminFirst = Read-Host "Admin First Name"
        $adminLast = Read-Host "Admin Last Name"
        $adminEmail = Read-Host "Admin Email"
        $adminPassword = Read-Host "Admin Password" -AsSecureString
        $adminPasswordText = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
            [Runtime.InteropServices.Marshal]::SecureStringToBSTR($adminPassword))

        $registerBody = @{
            name = $companyName
            email = $companyEmail
            adminFirstName = $adminFirst
            adminLastName = $adminLast
            adminEmail = $adminEmail
            adminPassword = $adminPasswordText
            plan = "trial"
        } | ConvertTo-Json

        try {
            $company = Invoke-RestMethod -Uri "$API_BASE/api/companies/register" `
                -Method POST `
                -Body $registerBody `
                -ContentType "application/json"

            Write-Host "`n✅ Company registered successfully!" -ForegroundColor Green
            Write-Host "Company ID: $($company.company.id)" -ForegroundColor Gray
            Write-Host "Subscription: $($company.subscription.plan) (Trial ends: $($company.subscription.trialEndsAt))" -ForegroundColor Gray
        } catch {
            Write-Host "`n❌ Registration failed: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
    "2" {
        $companyId = Read-Host "`nEnter Company ID"
        
        try {
            $headers = @{ "Authorization" = "Bearer $global:token" }
            $company = Invoke-RestMethod -Uri "$API_BASE/api/companies/$companyId" -Headers $headers
            
            Write-Host "`n✅ Company Details:" -ForegroundColor Green
            $company | ConvertTo-Json -Depth 5
        } catch {
            Write-Host "`n❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
    "3" {
        Write-Host "`nGoodbye! 👋" -ForegroundColor Cyan
    }
}
