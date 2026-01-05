#!/bin/bash
# Setup script for Kutunza POS Web App

echo "🚀 Setting up Kutunza POS Web Application Suite..."
echo ""

# Check Node.js version
echo "📋 Checking prerequisites..."
node --version
npm --version

echo ""
echo "📦 Installing dependencies..."

# Install root dependencies
echo "→ Installing monorepo dependencies..."
npm install

# Install POS app dependencies
echo "→ Installing POS app dependencies..."
cd pos-web-app
npm install
cd ..

# Install customer display dependencies
echo "→ Installing customer display dependencies..."
cd customer-display
npm install
cd ..

# Install sync server dependencies
echo "→ Installing sync server dependencies..."
cd sync-server
npm install

# Install admin dashboard dependencies
echo "→ Installing admin dashboard dependencies..."
cd admin-dashboard
npm install
cd ../..

echo ""
echo "✅ Installation complete!"
echo ""
echo "📝 Next steps:"
echo "1. Configure environment variables:"
echo "   - cp sync-server/.env.example sync-server/.env"
echo "   - cp pos-web-app/.env.example pos-web-app/.env"
echo "   - cp customer-display/.env.example customer-display/.env"
echo ""
echo "2. Setup database:"
echo "   - cd sync-server"
echo "   - npm run migrate"
echo ""
echo "3. Start development:"
echo "   - npm run dev:all"
echo ""
echo "Or start individually:"
echo "   - cd sync-server && npm run dev       (Port 5000)"
echo "   - cd pos-web-app && npm run dev       (Port 3000)"
echo "   - cd customer-display && npm run dev  (Port 3001)"
echo ""
echo "🎉 Ready to start developing!"
