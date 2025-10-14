#!/bin/bash
# Quick script to create test members in the morning

echo "🚀 Creating test members for your demo..."

# Get password from Key Vault
POSTGRES_PASSWORD=$(az keyvault secret show --vault-name kv-ctn-demo-asr-dev --name postgres-password --query "value" -o tsv)

# Run the SQL script
PGSSLMODE=require PGPASSWORD="$POSTGRES_PASSWORD" psql \
  -h psql-ctn-demo-asr-dev.postgres.database.azure.com \
  -U asradmin \
  -d asr_dev \
  -f CREATE_TEST_MEMBERS.sql

echo ""
echo "✅ Done! Refresh your admin portal: https://calm-tree-03352ba03.1.azurestaticapps.net"
echo ""
