#!/bin/bash

# Setup EAS Secrets for Lost and Found App
# This script configures environment variables for EAS builds

echo "🔐 Setting up EAS Secrets for Lost and Found App"
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "Please create a .env file with your API keys"
    exit 1
fi

# Load environment variables from .env
export $(cat .env | grep -v '^#' | xargs)

# Check if GOOGLE_MAPS_API_KEY is set
if [ -z "$GOOGLE_MAPS_API_KEY" ]; then
    echo "❌ Error: GOOGLE_MAPS_API_KEY not found in .env file"
    exit 1
fi

echo "📍 Found Google Maps API Key: ${GOOGLE_MAPS_API_KEY:0:10}..."
echo ""

# Set secret for project (available to all build profiles)
echo "Setting project-level secret..."
eas secret:create --scope project --name GOOGLE_MAPS_API_KEY --value "$GOOGLE_MAPS_API_KEY" --type string --force 2>&1 | grep -v "This command is deprecated"

echo ""
echo "✅ EAS Secrets configured successfully!"
echo ""
echo "📝 Verify secrets:"
echo "   eas secret:list"
echo ""
echo "📝 Next steps:"
echo "1. Local development: npm start"
echo "2. Development build: eas build --platform android --profile development"
echo "3. Production build: eas build --platform android --profile production"
echo ""
echo "🗺️  Your Google Maps API key will be securely injected during EAS builds"
echo "🔒 The key is stored encrypted and never exposed in logs"
