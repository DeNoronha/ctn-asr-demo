#!/bin/bash
# Run the admin_tasks table fix migration

echo "Running admin_tasks table fix migration..."
echo ""

# Get connection string from .credentials
source ../.credentials

# Run migration
psql "$AZURE_POSTGRES_CONNECTION_STRING" -f 008-tasks-table-fix.sql

echo ""
echo "Migration completed!"
