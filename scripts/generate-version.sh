#!/bin/bash

# Generate version.json for build metadata
# This script should be called during CI/CD build process

# Get parameters from Azure DevOps environment or use defaults
BUILD_NUMBER="${BUILD_BUILDNUMBER:-dev}"
BUILD_ID="${BUILD_BUILDID:-0}"
BUILD_REASON="${BUILD_REASON:-Manual}"
BUILD_SOURCEVERSION="${BUILD_SOURCEVERSION:-$(git rev-parse HEAD 2>/dev/null || echo 'unknown')}"
BUILD_SOURCEBRANCH="${BUILD_SOURCEBRANCH:-$(git branch --show-current 2>/dev/null || echo 'unknown')}"
BUILD_REPOSITORY_NAME="${BUILD_REPOSITORY_NAME:-ASR}"
BUILD_REQUESTEDFOR="${BUILD_REQUESTEDFOR:-System}"

# Get current timestamp
BUILD_TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Determine output path
OUTPUT_PATH="${1:-.}"

# Create version.json
cat > "$OUTPUT_PATH/version.json" <<EOF
{
  "buildNumber": "$BUILD_NUMBER",
  "buildId": "$BUILD_ID",
  "buildReason": "$BUILD_REASON",
  "commitSha": "${BUILD_SOURCEVERSION:0:8}",
  "commitShaFull": "$BUILD_SOURCEVERSION",
  "branch": "$BUILD_SOURCEBRANCH",
  "repository": "$BUILD_REPOSITORY_NAME",
  "triggeredBy": "$BUILD_REQUESTEDFOR",
  "timestamp": "$BUILD_TIMESTAMP",
  "version": "$(date -u +"%Y%m%d").${BUILD_ID}",
  "environment": "${ENVIRONMENT:-production}"
}
EOF

echo "✅ Generated version.json:"
cat "$OUTPUT_PATH/version.json"
