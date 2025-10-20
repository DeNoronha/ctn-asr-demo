#!/bin/bash
###############################################################################
# Extract Current Database Schema
# Outputs complete DDL to database/schema/current_schema.sql
###############################################################################

set -e

echo "=========================================="
echo "Extracting Database Schema"
echo "=========================================="
echo ""

# Database connection details
DB_HOST="psql-ctn-demo-asr-dev.postgres.database.azure.com"
DB_PORT="5432"
DB_NAME="asr_dev"
DB_USER="asradmin"
OUTPUT_FILE="schema/current_schema.sql"

# Check if password is set
if [ -z "$PGPASSWORD" ]; then
    echo "⚠️  PGPASSWORD environment variable not set"
    echo "Run: export PGPASSWORD=<value-from-credentials-file>"
    echo "Get the value from .credentials file in project root"
    exit 1
fi

echo "Connection Details:"
echo "  Host: $DB_HOST"
echo "  Database: $DB_NAME"
echo "  User: $DB_USER"
echo "  Output: $OUTPUT_FILE"
echo ""

# Create schema directory if it doesn't exist
mkdir -p schema

# Add header to output file
cat > "$OUTPUT_FILE" << 'EOF'
-- ============================================
-- CTN Association Register Database Schema
-- Database: asr_dev (psql-ctn-demo-asr-dev)
-- Extracted: $(date +%Y-%m-%d %H:%M:%S)
-- Method: pg_dump (automated)
-- ============================================

EOF

# Extract schema using pg_dump
echo "Extracting schema..."
pg_dump \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  --schema-only \
  --no-owner \
  --no-privileges \
  --no-tablespaces \
  --no-comments \
  >> "$OUTPUT_FILE"

# Check if extraction was successful
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Schema extracted successfully!"
    echo "   File: $OUTPUT_FILE"
    echo "   Size: $(wc -l < "$OUTPUT_FILE") lines"
    echo ""
    echo "Next steps:"
    echo "1. Review the schema file"
    echo "2. Commit to Git: git add $OUTPUT_FILE && git commit -m 'chore: Update database schema'"
    echo "3. Push to remote: git push origin main"
else
    echo ""
    echo "❌ Schema extraction failed!"
    exit 1
fi

echo "=========================================="
