#!/bin/bash
# =====================================================
# Audit Log Retention Policy - Purge Script
# =====================================================
# Purpose: Purge audit logs and PII mappings older than 90 days
# GDPR: Article 5(1)(e) - Storage Limitation
# Schedule: Run daily via Azure Function timer trigger or cron
# =====================================================

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
  echo -e "${BLUE}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_warning() {
  echo -e "${YELLOW}[WARNING]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# =====================================================
# Configuration
# =====================================================

# PostgreSQL connection parameters
# Priority: 1) Command line args, 2) Environment variables, 3) Error
POSTGRES_HOST="${POSTGRES_HOST:-}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_DATABASE="${POSTGRES_DATABASE:-}"
POSTGRES_USER="${POSTGRES_USER:-}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-''}"

# Retention period (days)
RETENTION_DAYS="${RETENTION_DAYS:-90}"

# Dry run mode (default: false)
DRY_RUN="${DRY_RUN:-false}"

# =====================================================
# Validate Configuration
# =====================================================

validate_config() {
  log_info "Validating configuration..."

  if [[ -z "$POSTGRES_HOST" ]]; then
    log_error "POSTGRES_HOST is not set"
    exit 1
  fi

  if [[ -z "$POSTGRES_DATABASE" ]]; then
    log_error "POSTGRES_DATABASE is not set"
    exit 1
  fi

  if [[ -z "$POSTGRES_USER" ]]; then
    log_error "POSTGRES_USER is not set"
    exit 1
  fi

  if [[ -z "$POSTGRES_PASSWORD" ]]; then
    log_error "POSTGRES_PASSWORD is not set"
    exit 1
  fi

  log_success "Configuration validated"
}

# =====================================================
# Build PostgreSQL Connection String
# =====================================================

build_connection_string() {
  echo "postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DATABASE}?sslmode=require"
}

# =====================================================
# Test Database Connection
# =====================================================

test_connection() {
  log_info "Testing database connection..."

  CONNECTION_STRING=$(build_connection_string)

  if psql "$CONNECTION_STRING" -c "SELECT 1;" > /dev/null 2>&1; then
    log_success "Database connection successful"
    return 0
  else
    log_error "Database connection failed"
    return 1
  fi
}

# =====================================================
# Get Current Audit Log Statistics
# =====================================================

get_statistics() {
  log_info "Gathering audit log statistics..."

  CONNECTION_STRING=$(build_connection_string)

  # Get total audit logs
  TOTAL_AUDIT_LOGS=$(psql "$CONNECTION_STRING" -t -c "SELECT COUNT(*) FROM audit_log;")
  TOTAL_AUDIT_LOGS=$(echo "$TOTAL_AUDIT_LOGS" | xargs) # Trim whitespace

  # Get old audit logs (to be purged)
  OLD_AUDIT_LOGS=$(psql "$CONNECTION_STRING" -t -c "SELECT COUNT(*) FROM audit_log WHERE dt_created < NOW() - INTERVAL '${RETENTION_DAYS} days';")
  OLD_AUDIT_LOGS=$(echo "$OLD_AUDIT_LOGS" | xargs)

  # Get total PII mappings
  TOTAL_PII_MAPPINGS=$(psql "$CONNECTION_STRING" -t -c "SELECT COUNT(*) FROM audit_log_pii_mapping;")
  TOTAL_PII_MAPPINGS=$(echo "$TOTAL_PII_MAPPINGS" | xargs)

  # Get old PII mappings (to be purged)
  OLD_PII_MAPPINGS=$(psql "$CONNECTION_STRING" -t -c "SELECT COUNT(*) FROM audit_log_pii_mapping WHERE dt_created < NOW() - INTERVAL '${RETENTION_DAYS} days';")
  OLD_PII_MAPPINGS=$(echo "$OLD_PII_MAPPINGS" | xargs)

  log_info "Audit Logs: $TOTAL_AUDIT_LOGS total, $OLD_AUDIT_LOGS to purge"
  log_info "PII Mappings: $TOTAL_PII_MAPPINGS total, $OLD_PII_MAPPINGS to purge"
}

# =====================================================
# Execute Purge (or Dry Run)
# =====================================================

execute_purge() {
  CONNECTION_STRING=$(build_connection_string)

  if [[ "$DRY_RUN" == "true" ]]; then
    log_warning "DRY RUN MODE - No data will be deleted"
    log_info "Would delete $OLD_AUDIT_LOGS audit logs older than $RETENTION_DAYS days"
    log_info "Would delete $OLD_PII_MAPPINGS PII mappings older than $RETENTION_DAYS days"
    return 0
  fi

  log_info "Executing purge function..."

  # Call PostgreSQL function
  RESULT=$(psql "$CONNECTION_STRING" -t -c "SELECT * FROM purge_old_audit_logs();")

  # Parse result (format: "audit_logs_deleted | pii_mappings_deleted")
  AUDIT_LOGS_DELETED=$(echo "$RESULT" | awk '{print $1}' | xargs)
  PII_MAPPINGS_DELETED=$(echo "$RESULT" | awk '{print $3}' | xargs)

  log_success "Purged $AUDIT_LOGS_DELETED audit logs"
  log_success "Purged $PII_MAPPINGS_DELETED PII mappings"
}

# =====================================================
# Log Purge Operation to Audit Log
# =====================================================

log_purge_operation() {
  CONNECTION_STRING=$(build_connection_string)

  log_info "Logging purge operation to audit_log..."

  # Insert audit log entry for purge operation
  psql "$CONNECTION_STRING" -c "
    INSERT INTO audit_log (
      event_type,
      severity,
      user_id,
      resource_type,
      action,
      result,
      details,
      dt_created
    ) VALUES (
      'DATA_EXPORTED',
      'INFO',
      'system',
      'audit_log',
      'purge',
      'success',
      '{\"retention_days\": ${RETENTION_DAYS}, \"audit_logs_deleted\": ${AUDIT_LOGS_DELETED:-0}, \"pii_mappings_deleted\": ${PII_MAPPINGS_DELETED:-0}}'::jsonb,
      NOW()
    )
  " > /dev/null

  log_success "Purge operation logged to audit_log"
}

# =====================================================
# Main Execution
# =====================================================

main() {
  log_info "======================================================"
  log_info "Audit Log Retention Policy - Purge Script"
  log_info "======================================================"
  log_info "Retention Period: $RETENTION_DAYS days"
  log_info "Dry Run: $DRY_RUN"
  log_info "======================================================"

  # Validate configuration
  validate_config

  # Test database connection
  if ! test_connection; then
    log_error "Cannot proceed without database connection"
    exit 1
  fi

  # Get statistics before purge
  get_statistics

  # Check if there's anything to purge
  if [[ "$OLD_AUDIT_LOGS" == "0" ]] && [[ "$OLD_PII_MAPPINGS" == "0" ]]; then
    log_info "No audit logs or PII mappings to purge"
    exit 0
  fi

  # Execute purge
  execute_purge

  # Log purge operation (only if not dry run)
  if [[ "$DRY_RUN" != "true" ]]; then
    log_purge_operation
  fi

  log_info "======================================================"
  log_success "Audit log purge completed successfully"
  log_info "======================================================"
}

# =====================================================
# Usage Information
# =====================================================

usage() {
  cat << EOF
Usage: $0 [OPTIONS]

Purge audit logs and PII mappings older than specified retention period.

OPTIONS:
  --dry-run           Run in dry-run mode (no data will be deleted)
  --retention-days N  Set retention period in days (default: 90)
  --help              Show this help message

ENVIRONMENT VARIABLES:
  POSTGRES_HOST       PostgreSQL host
  POSTGRES_PORT       PostgreSQL port (default: 5432)
  POSTGRES_DATABASE   PostgreSQL database name
  POSTGRES_USER       PostgreSQL username
  POSTGRES_PASSWORD   PostgreSQL password
  RETENTION_DAYS      Retention period in days (default: 90)
  DRY_RUN             Set to 'true' for dry-run mode (default: false)

EXAMPLES:
  # Dry run with default 90-day retention
  $0 --dry-run

  # Purge with 60-day retention
  $0 --retention-days 60

  # Using environment variables
  POSTGRES_HOST=psql-ctn-demo-asr-dev.postgres.database.azure.com \\
  POSTGRES_DATABASE=asr_dev \\
  POSTGRES_USER=asradmin \\
  POSTGRES_PASSWORD=your_password \\
  $0

EOF
}

# =====================================================
# Parse Command Line Arguments
# =====================================================

while [[ $# -gt 0 ]]; do
  case $1 in
    --dry-run)
      DRY_RUN="true"
      shift
      ;;
    --retention-days)
      RETENTION_DAYS="$2"
      shift 2
      ;;
    --help)
      usage
      exit 0
      ;;
    *)
      log_error "Unknown option: $1"
      usage
      exit 1
      ;;
  esac
done

# Run main function
main
