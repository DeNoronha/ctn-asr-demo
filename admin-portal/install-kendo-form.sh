#!/bin/bash
# Install Kendo React Form package

cd "$(dirname "$0")"

echo "Installing @progress/kendo-react-form..."
npm install @progress/kendo-react-form@8.5.0 --legacy-peer-deps

echo "Installation complete!"
