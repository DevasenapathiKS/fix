#!/bin/bash

echo "🔍 Checking Client Login Setup..."
echo ""

# Check if .env exists
if [ -f ".env" ]; then
    echo "✅ .env file exists"
    cat .env
else
    echo "❌ .env file missing!"
    echo "Creating .env file..."
    cp .env.example .env
    echo "✅ .env file created"
fi

echo ""
echo "🌐 Testing Backend Connection..."
curl -I https://admin.eopsys.xyz/api/customer/auth/login 2>&1 | grep -E "HTTP|Access-Control"

echo ""
echo "📦 Client Configuration:"
echo "   - Port: 5173"
echo "   - API URL: $(grep VITE_API_URL .env || echo 'https://admin.eopsys.xyz/api')"

echo ""
echo "🚀 You can now:"
echo "   1. Open http://localhost:5173/login"
echo "   2. Try to login with valid credentials"
echo "   3. Check browser console (F12) for debug logs"
echo "   4. Check Network tab for API requests"
echo ""
