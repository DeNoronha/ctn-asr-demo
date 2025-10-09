#!/bin/bash

# Member Portal Setup Script

echo "🚀 Setting up CTN Member Portal..."

# Navigate to member-portal directory
cd ~/Desktop/Projects/Data\ in\ Logistics/repo/ASR/member-portal

# Create React App with TypeScript
echo "📦 Creating React app..."
npx create-react-app . --template typescript

# Install dependencies
echo "📚 Installing dependencies..."
npm install --save \
  @progress/kendo-react-layout \
  @progress/kendo-react-buttons \
  @progress/kendo-react-inputs \
  @progress/kendo-react-labels \
  @progress/kendo-react-dialogs \
  @progress/kendo-react-indicators \
  @progress/kendo-licensing \
  @progress/kendo-theme-default \
  axios \
  lucide-react \
  --legacy-peer-deps

echo "✅ Member Portal setup complete!"
echo ""
echo "Next steps:"
echo "1. cd ~/Desktop/Projects/Data\ in\ Logistics/repo/ASR/member-portal"
echo "2. npm start"
