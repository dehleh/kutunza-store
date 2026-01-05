# Setup script for Kutunza POS Web App (Windows)

Write-Host "🚀 Setting up Kutunza POS Web Application Suite..." -ForegroundColor Cyan
Write-Host ""

# Check Node.js version
Write-Host "📋 Checking prerequisites..." -ForegroundColor Yellow
node --version
npm --version

Write-Host ""
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow

# Install root dependencies
Write-Host "→ Installing monorepo dependencies..."
npm install

# Install POS app dependencies
Write-Host "→ Installing POS app dependencies..."
Set-Location pos-web-app
npm install
Set-Location ..

# Install customer display dependencies
Write-Host "→ Installing customer display dependencies..."
Set-Location customer-display
npm install
Set-Location ..

# Install sync server dependencies
Write-Host "→ Installing sync server dependencies..."
Set-Location sync-server
npm install

# Install admin dashboard dependencies
Write-Host "→ Installing admin dashboard dependencies..."
Set-Location admin-dashboard
npm install
Set-Location ..\..

Write-Host ""
Write-Host "✅ Installation complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Next steps:" -ForegroundColor Cyan
Write-Host "1. Configure environment variables:"
Write-Host "   - Copy-Item sync-server\.env.example sync-server\.env"
Write-Host "   - Copy-Item pos-web-app\.env.example pos-web-app\.env"
Write-Host "   - Copy-Item customer-display\.env.example customer-display\.env"
Write-Host ""
Write-Host "2. Setup database:"
Write-Host "   - cd sync-server"
Write-Host "   - npm run migrate"
Write-Host ""
Write-Host "3. Start development:"
Write-Host "   - npm run dev:all"
Write-Host ""
Write-Host "Or start individually:"
Write-Host "   - cd sync-server; npm run dev       (Port 5000)"
Write-Host "   - cd pos-web-app; npm run dev       (Port 3000)"
Write-Host "   - cd customer-display; npm run dev  (Port 3001)"
Write-Host ""
Write-Host "🎉 Ready to start developing!" -ForegroundColor Green
