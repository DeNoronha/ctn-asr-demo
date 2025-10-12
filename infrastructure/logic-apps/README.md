# Logic Apps Workflow Automation - CTN ASR

## Overview

This directory contains Azure Logic Apps workflow definitions for automated business processes in the CTN Association Register system. These workflows handle approval processes, token renewal notifications, and document verification workflows.

## Available Workflows

### 1. Member Approval Workflow (`member-approval-workflow.json`)

**Purpose:** Automates the member application approval process with email-based approval routing.

**Trigger:** Event Grid event `Member.Application.Created`

**Features:**
- Receives new member application events from Event Grid
- Sends approval email to administrators with actionable buttons
- Handles three decision paths:
  - **Approve:** Activates member account and sends welcome email
  - **Reject:** Records rejection and notifies applicant
  - **Request More Information:** Flags application and requests additional details

**Required Connections:**
- Azure Event Grid (for receiving application events)
- Office 365 (for approval emails)
- Azure Communication Services (for applicant notifications)
- HTTP (for calling Function App APIs)

**Parameters:**
- `adminApprovalEmail`: Email address for approval routing (default: `admin@ctn.nl`)
- `functionAppBaseUrl`: Base URL of the Function App (e.g., `https://fa-ctn-asr-dev.azurewebsites.net`)

---

### 2. Token Renewal Workflow (`token-renewal-workflow.json`)

**Purpose:** Automated daily monitoring and notification for expiring BVAD tokens.

**Trigger:** Daily recurrence at 9:00 AM (W. Europe Standard Time)

**Features:**
- Queries Function App API for tokens expiring within 30 days
- Sends differentiated notifications based on urgency:
  - **Urgent (≤7 days):** Red-flagged urgent renewal notice
  - **Standard (8-30 days):** Standard renewal reminder
- Logs all notifications sent
- Sends daily summary report to administrators

**Required Connections:**
- Azure Communication Services (for member notifications)
- Office 365 (for admin summary)
- HTTP (for calling Function App APIs)

**Parameters:**
- `functionAppBaseUrl`: Base URL of the Function App
- `memberPortalUrl`: URL of the Member Portal (default: `https://calm-pebble-0b2ffb603-12.westeurope.5.azurestaticapps.net`)

---

### 3. Document Verification Workflow (`document-verification-workflow.json`)

**Purpose:** Automates KvK document verification using Azure AI Document Intelligence with manual review fallback.

**Trigger:** Blob storage trigger when new documents are uploaded to `kvk-documents` container

**Features:**
- Monitors blob storage for new KvK document uploads
- Triggers Azure AI Document Intelligence analysis via Function App
- **Auto-approval path:** High-confidence extractions are automatically approved
- **Manual review path:** Low-confidence or problematic extractions are flagged for admin review
- Email notifications sent to applicants based on verification outcome
- Admin approval/rejection workflow for flagged documents

**Required Connections:**
- Azure Blob Storage (for document upload monitoring)
- Azure Communication Services (for applicant notifications)
- Office 365 (for admin approval emails)
- HTTP (for calling Function App APIs)

**Parameters:**
- `functionAppBaseUrl`: Base URL of the Function App
- `adminEmail`: Email address for manual review requests (default: `admin@ctn.nl`)

---

## Deployment Instructions

### Prerequisites

1. **Azure Subscription** with permissions to create Logic Apps
2. **Resource Group:** `rg-ctn-asr-{environment}` (created via Bicep)
3. **Required Azure Resources:**
   - Azure Event Grid Topic
   - Azure Communication Services
   - Azure Blob Storage Account
   - Azure Function App
   - Office 365 account (for admin emails)

### Step 1: Create API Connections

Before deploying Logic Apps, create the required API connections in Azure Portal:

#### 1.1 Create Event Grid Connection

```bash
az resource create \
  --resource-group rg-ctn-asr-dev \
  --resource-type Microsoft.Web/connections \
  --name azureeventgrid \
  --properties '{
    "displayName": "Azure Event Grid",
    "api": {
      "id": "/subscriptions/{subscription-id}/providers/Microsoft.Web/locations/westeurope/managedApis/azureeventgrid"
    }
  }'
```

#### 1.2 Create Office 365 Connection

```bash
az resource create \
  --resource-group rg-ctn-asr-dev \
  --resource-type Microsoft.Web/connections \
  --name office365 \
  --properties '{
    "displayName": "Office 365 Outlook",
    "api": {
      "id": "/subscriptions/{subscription-id}/providers/Microsoft.Web/locations/westeurope/managedApis/office365"
    }
  }'
```

After creation, authenticate the connection in Azure Portal:
1. Navigate to **Resource Group** → **API Connections** → **office365**
2. Click **Edit API connection**
3. Click **Authorize** and sign in with admin credentials

#### 1.3 Create Azure Communication Services Connection

```bash
az resource create \
  --resource-group rg-ctn-asr-dev \
  --resource-type Microsoft.Web/connections \
  --name azurecommunicationservices \
  --properties '{
    "displayName": "Azure Communication Services",
    "api": {
      "id": "/subscriptions/{subscription-id}/providers/Microsoft.Web/locations/westeurope/managedApis/azurecommunicationservices"
    },
    "parameterValues": {
      "connectionString": "{communication-services-connection-string}"
    }
  }'
```

#### 1.4 Create Blob Storage Connection

```bash
az resource create \
  --resource-group rg-ctn-asr-dev \
  --resource-type Microsoft.Web/connections \
  --name azureblob \
  --properties '{
    "displayName": "Azure Blob Storage",
    "api": {
      "id": "/subscriptions/{subscription-id}/providers/Microsoft.Web/locations/westeurope/managedApis/azureblob"
    },
    "parameterValues": {
      "accountName": "stctnasrdev",
      "accessKey": "{storage-account-key}"
    }
  }'
```

---

### Step 2: Deploy Logic Apps

Deploy each workflow using Azure CLI:

#### 2.1 Deploy Member Approval Workflow

```bash
az logic workflow create \
  --resource-group rg-ctn-asr-dev \
  --location westeurope \
  --name logic-member-approval \
  --definition member-approval-workflow.json \
  --parameters '{
    "$connections": {
      "value": {
        "azureeventgrid": {
          "id": "/subscriptions/{subscription-id}/resourceGroups/rg-ctn-asr-dev/providers/Microsoft.Web/connections/azureeventgrid",
          "connectionId": "/subscriptions/{subscription-id}/resourceGroups/rg-ctn-asr-dev/providers/Microsoft.Web/connections/azureeventgrid"
        },
        "office365": {
          "id": "/subscriptions/{subscription-id}/resourceGroups/rg-ctn-asr-dev/providers/Microsoft.Web/connections/office365",
          "connectionId": "/subscriptions/{subscription-id}/resourceGroups/rg-ctn-asr-dev/providers/Microsoft.Web/connections/office365"
        },
        "azurecommunicationservices": {
          "id": "/subscriptions/{subscription-id}/resourceGroups/rg-ctn-asr-dev/providers/Microsoft.Web/connections/azurecommunicationservices",
          "connectionId": "/subscriptions/{subscription-id}/resourceGroups/rg-ctn-asr-dev/providers/Microsoft.Web/connections/azurecommunicationservices"
        }
      }
    },
    "adminApprovalEmail": {
      "value": "admin@ctn.nl"
    },
    "functionAppBaseUrl": {
      "value": "https://fa-ctn-asr-dev.azurewebsites.net"
    }
  }'
```

#### 2.2 Deploy Token Renewal Workflow

```bash
az logic workflow create \
  --resource-group rg-ctn-asr-dev \
  --location westeurope \
  --name logic-token-renewal \
  --definition token-renewal-workflow.json \
  --parameters '{
    "$connections": {
      "value": {
        "azurecommunicationservices": {
          "id": "/subscriptions/{subscription-id}/resourceGroups/rg-ctn-asr-dev/providers/Microsoft.Web/connections/azurecommunicationservices",
          "connectionId": "/subscriptions/{subscription-id}/resourceGroups/rg-ctn-asr-dev/providers/Microsoft.Web/connections/azurecommunicationservices"
        },
        "office365": {
          "id": "/subscriptions/{subscription-id}/resourceGroups/rg-ctn-asr-dev/providers/Microsoft.Web/connections/office365",
          "connectionId": "/subscriptions/{subscription-id}/resourceGroups/rg-ctn-asr-dev/providers/Microsoft.Web/connections/office365"
        }
      }
    },
    "functionAppBaseUrl": {
      "value": "https://fa-ctn-asr-dev.azurewebsites.net"
    },
    "memberPortalUrl": {
      "value": "https://calm-pebble-0b2ffb603-12.westeurope.5.azurestaticapps.net"
    }
  }'
```

#### 2.3 Deploy Document Verification Workflow

```bash
az logic workflow create \
  --resource-group rg-ctn-asr-dev \
  --location westeurope \
  --name logic-document-verification \
  --definition document-verification-workflow.json \
  --parameters '{
    "$connections": {
      "value": {
        "azureblob": {
          "id": "/subscriptions/{subscription-id}/resourceGroups/rg-ctn-asr-dev/providers/Microsoft.Web/connections/azureblob",
          "connectionId": "/subscriptions/{subscription-id}/resourceGroups/rg-ctn-asr-dev/providers/Microsoft.Web/connections/azureblob"
        },
        "azurecommunicationservices": {
          "id": "/subscriptions/{subscription-id}/resourceGroups/rg-ctn-asr-dev/providers/Microsoft.Web/connections/azurecommunicationservices",
          "connectionId": "/subscriptions/{subscription-id}/resourceGroups/rg-ctn-asr-dev/providers/Microsoft.Web/connections/azurecommunicationservices"
        },
        "office365": {
          "id": "/subscriptions/{subscription-id}/resourceGroups/rg-ctn-asr-dev/providers/Microsoft.Web/connections/office365",
          "connectionId": "/subscriptions/{subscription-id}/resourceGroups/rg-ctn-asr-dev/providers/Microsoft.Web/connections/office365"
        }
      }
    },
    "functionAppBaseUrl": {
      "value": "https://fa-ctn-asr-dev.azurewebsites.net"
    },
    "adminEmail": {
      "value": "admin@ctn.nl"
    }
  }'
```

---

### Step 3: Enable Logic Apps

After deployment, enable the workflows:

```bash
az logic workflow update \
  --resource-group rg-ctn-asr-dev \
  --name logic-member-approval \
  --state Enabled

az logic workflow update \
  --resource-group rg-ctn-asr-dev \
  --name logic-token-renewal \
  --state Enabled

az logic workflow update \
  --resource-group rg-ctn-asr-dev \
  --name logic-document-verification \
  --state Enabled
```

---

### Step 4: Configure Event Grid Subscription (Member Approval Workflow)

Create Event Grid subscription for member approval workflow:

```bash
# Get Logic App callback URL
CALLBACK_URL=$(az logic workflow show \
  --resource-group rg-ctn-asr-dev \
  --name logic-member-approval \
  --query "accessEndpoint" -o tsv)

# Create Event Grid subscription
az eventgrid event-subscription create \
  --name member-approval-subscription \
  --source-resource-id /subscriptions/{subscription-id}/resourceGroups/rg-ctn-asr-dev/providers/Microsoft.EventGrid/topics/ctn-asr-events \
  --endpoint "$CALLBACK_URL" \
  --endpoint-type webhook \
  --included-event-types Member.Application.Created
```

---

## Configuration

### Environment-Specific Parameters

Update parameters for each environment (dev, staging, prod):

| Parameter | Dev | Staging | Prod |
|-----------|-----|---------|------|
| `adminApprovalEmail` | admin@ctn.nl | admin@ctn.nl | admin@ctn.nl |
| `functionAppBaseUrl` | https://fa-ctn-asr-dev.azurewebsites.net | https://fa-ctn-asr-staging.azurewebsites.net | https://fa-ctn-asr-prod.azurewebsites.net |
| `memberPortalUrl` | https://calm-pebble-0b2ffb603-12.westeurope.5.azurestaticapps.net | {staging-url} | {prod-url} |

---

## Monitoring and Troubleshooting

### View Workflow Run History

```bash
az logic workflow list-runs \
  --resource-group rg-ctn-asr-dev \
  --name logic-member-approval
```

### View Specific Run Details

```bash
az logic workflow show-run \
  --resource-group rg-ctn-asr-dev \
  --name logic-member-approval \
  --run-name {run-id}
```

### Common Issues

1. **Event Grid events not triggering workflow**
   - Verify Event Grid subscription is active
   - Check Event Grid topic is publishing events
   - Verify callback URL is correct

2. **Email not sending**
   - Check Office 365 connection is authenticated
   - Verify Azure Communication Services connection string
   - Check sender email address is verified

3. **HTTP requests failing**
   - Verify Function App base URL is correct
   - Check Function App is running
   - Verify API endpoints exist

---

## Required Function App API Endpoints

The Logic Apps workflows depend on these API endpoints in the Function App:

### Member Approval Workflow
- `POST /api/v1/legal-entities/{id}/activate` - Activate member account
- `POST /api/v1/legal-entities/{id}/reject` - Reject application
- `POST /api/v1/legal-entities/{id}/request-info` - Request more information

### Token Renewal Workflow
- `GET /api/v1/tokens/expiring?daysUntilExpiry=30` - Get expiring tokens
- `POST /api/v1/tokens/{id}/notifications` - Log notification sent

### Document Verification Workflow
- `POST /api/v1/kvk/analyze-document` - Trigger document analysis
- `POST /api/v1/kvk/verifications/{id}/approve` - Approve verification
- `POST /api/v1/kvk/verifications/{id}/reject` - Reject verification
- `POST /api/v1/kvk/verifications/{id}/flag-review` - Flag for manual review

**Note:** Some of these endpoints need to be implemented. See API implementation tasks in ROADMAP.md.

---

## Security Considerations

1. **Managed Identities:** Enable managed identities for Logic Apps to access Azure resources
2. **API Authentication:** Secure Function App endpoints with authentication
3. **Connection Secrets:** Store connection strings in Azure Key Vault
4. **RBAC:** Assign appropriate roles to Logic Apps for accessing resources
5. **Network Security:** Use private endpoints for sensitive workflows

---

## Cost Optimization

- **Token Renewal Workflow:** Runs once daily = ~30 executions/month
- **Member Approval Workflow:** Event-driven, charges per execution
- **Document Verification Workflow:** Blob-triggered, charges per document upload

**Estimated Monthly Cost (Dev):** ~$5-10 USD for standard workflows

---

## Next Steps

1. ✅ Deploy API connections
2. ✅ Deploy Logic Apps
3. ⏳ Implement missing Function App API endpoints (see list above)
4. ⏳ Configure Event Grid subscriptions
5. ⏳ Test workflows end-to-end
6. ⏳ Set up monitoring and alerting
7. ⏳ Document approval procedures for administrators

---

## Additional Resources

- [Azure Logic Apps Documentation](https://docs.microsoft.com/azure/logic-apps/)
- [Event Grid Documentation](https://docs.microsoft.com/azure/event-grid/)
- [Azure Communication Services](https://docs.microsoft.com/azure/communication-services/)
- [Logic Apps Workflow Definition Language](https://docs.microsoft.com/azure/logic-apps/logic-apps-workflow-definition-language)

---

**Version:** 1.0.0
**Last Updated:** October 12, 2025
**Author:** CTN Development Team
