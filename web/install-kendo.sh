#!/bin/bash

# Install Kendo React packages for Option 3 (Full Integration)
echo "Installing Kendo React packages..."

npm install --save \
  @progress/kendo-react-layout \
  @progress/kendo-react-grid \
  @progress/kendo-data-query \
  @progress/kendo-react-buttons \
  @progress/kendo-react-inputs \
  @progress/kendo-react-dropdowns \
  @progress/kendo-react-dateinputs \
  @progress/kendo-react-indicators \
  @progress/kendo-licensing \
  @progress/kendo-theme-default

echo "Kendo React packages installed successfully!"
echo "Next: Run 'npm start' to start the development server"
