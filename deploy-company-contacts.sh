#!/bin/bash
# Deploy new API functions and database migrations

echo "=== Deploying Company & Contacts Features ==="

# 1. Run database migrations
echo "Step 1: Running database migrations..."
psql $DATABASE_URL -f database/migrations/002_add_contact_fields.sql
psql $DATABASE_URL -f database/migrations/003_link_members_to_legal_entities.sql

# 2. Build API
echo "Step 2: Building API..."
cd api
npm run build

# 3. Deploy to Azure
echo "Step 3: Deploying to Azure Functions..."
func azure functionapp publish <your-function-app-name>

echo "=== Deployment Complete ==="
echo ""
echo "New API Endpoints:"
echo "  GET    /api/v1/legal-entities/{id}"
echo "  PUT    /api/v1/legal-entities/{id}"
echo "  GET    /api/v1/legal-entities/{id}/contacts"
echo "  POST   /api/v1/contacts"
echo "  PUT    /api/v1/contacts/{id}"
echo "  DELETE /api/v1/contacts/{id}"
