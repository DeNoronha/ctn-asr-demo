# ============================================
# CTN Demo ASR - Main Terraform Configuration
# ============================================

terraform {
  required_version = ">= 1.6.0"
  
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.80"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }
  
  backend "azurerm" {
    resource_group_name  = "rg-ctn-demo-tfstate"
    storage_account_name = "stctntfstate12186"
    container_name       = "tfstate"
    key                  = "ctn-demo-asr.tfstate"
  }
}

provider "azurerm" {
  features {
    key_vault {
      purge_soft_delete_on_destroy = true
    }
    resource_group {
      prevent_deletion_if_contains_resources = false
    }
  }
}

# ============================================
# Local Variables
# ============================================

locals {
  project_name = "${var.project_prefix}-${var.environment}"
  
  common_tags = merge(
    var.tags,
    {
      Project     = "CTN Demo ASR"
      Environment = var.environment
      ManagedBy   = "Terraform"
      CreatedDate = formatdate("YYYY-MM-DD", timestamp())
    }
  )
}

# ============================================
# Resource Group
# ============================================

resource "azurerm_resource_group" "main" {
  name     = "rg-${local.project_name}"
  location = var.location
  tags     = local.common_tags
}

# ============================================
# Storage Account
# ============================================

resource "azurerm_storage_account" "main" {
  name                     = replace("st${var.project_prefix}${var.environment}", "-", "")
  resource_group_name      = azurerm_resource_group.main.name
  location                 = azurerm_resource_group.main.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
  
  min_tls_version          = "TLS1_2"
  enable_https_traffic_only = true
  
  tags = local.common_tags
}

resource "azurerm_storage_container" "documents" {
  name                  = "member-documents"
  storage_account_name  = azurerm_storage_account.main.name
  container_access_type = "private"
}

resource "azurerm_storage_container" "functions" {
  name                  = "function-releases"
  storage_account_name  = azurerm_storage_account.main.name
  container_access_type = "private"
}

# ============================================
# Application Insights
# ============================================

resource "azurerm_log_analytics_workspace" "main" {
  name                = "log-${local.project_name}"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  sku                 = "PerGB2018"
  retention_in_days   = 30
  
  tags = local.common_tags
}

resource "azurerm_application_insights" "main" {
  name                = "appi-${local.project_name}"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  workspace_id        = azurerm_log_analytics_workspace.main.id
  application_type    = "web"
  
  tags = local.common_tags
}

# ============================================
# Key Vault
# ============================================

data "azurerm_client_config" "current" {}

resource "azurerm_key_vault" "main" {
  name                       = "kv-${local.project_name}"
  resource_group_name        = azurerm_resource_group.main.name
  location                   = azurerm_resource_group.main.location
  tenant_id                  = data.azurerm_client_config.current.tenant_id
  sku_name                   = "standard"
  soft_delete_retention_days = 7
  purge_protection_enabled   = false
  
  enable_rbac_authorization = true
  
  tags = local.common_tags
}

# ============================================
# PostgreSQL Flexible Server
# ============================================

resource "random_password" "postgres_admin" {
  length  = 32
  special = true
}

resource "azurerm_postgresql_flexible_server" "main" {
  name                = "psql-${local.project_name}"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  
  version                      = "15"
  administrator_login          = "asradmin"
  administrator_password       = random_password.postgres_admin.result
  
  sku_name   = "B_Standard_B1ms"
  storage_mb = 32768
  
  backup_retention_days = 7
  
  tags = local.common_tags
}

resource "azurerm_postgresql_flexible_server_database" "asr" {
  name      = "asr_${var.environment}"
  server_id = azurerm_postgresql_flexible_server.main.id
  charset   = "UTF8"
  collation = "en_US.utf8"
}

resource "azurerm_postgresql_flexible_server_firewall_rule" "allow_azure" {
  name             = "AllowAzureServices"
  server_id        = azurerm_postgresql_flexible_server.main.id
  start_ip_address = "0.0.0.0"
  end_ip_address   = "0.0.0.0"
}

# ============================================
# Function App
# ============================================

resource "azurerm_service_plan" "main" {
  name                = "plan-${local.project_name}"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  os_type             = "Linux"
  sku_name            = "Y1"
  
  tags = local.common_tags
}

resource "azurerm_linux_function_app" "main" {
  name                       = "func-${local.project_name}"
  resource_group_name        = azurerm_resource_group.main.name
  location                   = azurerm_resource_group.main.location
  service_plan_id            = azurerm_service_plan.main.id
  storage_account_name       = azurerm_storage_account.main.name
  storage_account_access_key = azurerm_storage_account.main.primary_access_key
  
  site_config {
    application_stack {
      node_version = "20"
    }
    
    cors {
      allowed_origins = ["https://portal.azure.com"]
    }
    
    application_insights_connection_string = azurerm_application_insights.main.connection_string
    application_insights_key               = azurerm_application_insights.main.instrumentation_key
  }
  
  app_settings = {
    "FUNCTIONS_WORKER_RUNTIME"       = "node"
    "WEBSITE_NODE_DEFAULT_VERSION"   = "~20"
    "WEBSITE_RUN_FROM_PACKAGE"       = "1"
    
    # Database
    "POSTGRES_HOST"     = azurerm_postgresql_flexible_server.main.fqdn
    "POSTGRES_PORT"     = "5432"
    "POSTGRES_DATABASE" = azurerm_postgresql_flexible_server_database.asr.name
    "POSTGRES_USER"     = azurerm_postgresql_flexible_server.main.administrator_login
    "POSTGRES_PASSWORD" = "@Microsoft.KeyVault(VaultName=${azurerm_key_vault.main.name};SecretName=postgres-password)"
    
    # Storage
    "AZURE_STORAGE_CONNECTION_STRING" = azurerm_storage_account.main.primary_connection_string
    
    # Environment
    "ENVIRONMENT" = var.environment
  }
  
  identity {
    type = "SystemAssigned"
  }
  
  tags = local.common_tags
}

# ============================================
# Static Web App
# ============================================

resource "azurerm_static_web_app" "main" {
  name                = "stapp-${local.project_name}"
  resource_group_name = azurerm_resource_group.main.name
  location            = "westeurope"
  sku_tier            = "Free"
  sku_size            = "Free"
  
  tags = local.common_tags
}

# ============================================
# Key Vault Secrets
# ============================================

resource "azurerm_key_vault_secret" "postgres_password" {
  name         = "postgres-password"
  value        = random_password.postgres_admin.result
  key_vault_id = azurerm_key_vault.main.id
  
  depends_on = [
    azurerm_role_assignment.terraform_kv_admin
  ]
}

resource "azurerm_key_vault_secret" "postgres_connection_string" {
  name  = "postgres-connection-string"
  value = "postgresql://${azurerm_postgresql_flexible_server.main.administrator_login}:${random_password.postgres_admin.result}@${azurerm_postgresql_flexible_server.main.fqdn}:5432/${azurerm_postgresql_flexible_server_database.asr.name}?sslmode=require"
  key_vault_id = azurerm_key_vault.main.id
  
  depends_on = [
    azurerm_role_assignment.terraform_kv_admin
  ]
}

# ============================================
# RBAC - Key Vault Access
# ============================================

resource "azurerm_role_assignment" "terraform_kv_admin" {
  scope                = azurerm_key_vault.main.id
  role_definition_name = "Key Vault Administrator"
  principal_id         = data.azurerm_client_config.current.object_id
}

resource "azurerm_role_assignment" "function_kv_secrets_user" {
  scope                = azurerm_key_vault.main.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = azurerm_linux_function_app.main.identity[0].principal_id
}

# ============================================
# Automation Account for Auto-Shutdown
# ============================================

resource "azurerm_automation_account" "main" {
  name                = "auto-${local.project_name}"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  sku_name            = "Free"
  
  identity {
    type = "SystemAssigned"
  }
  
  tags = local.common_tags
}

# Grant automation account permissions to manage PostgreSQL
resource "azurerm_role_assignment" "automation_contributor" {
  scope                = azurerm_resource_group.main.id
  role_definition_name = "Contributor"
  principal_id         = azurerm_automation_account.main.identity[0].principal_id
}

resource "azurerm_automation_runbook" "stop_postgres" {
  name                    = "Stop-PostgreSQL"
  resource_group_name     = azurerm_resource_group.main.name
  location                = azurerm_resource_group.main.location
  automation_account_name = azurerm_automation_account.main.name
  log_verbose             = true
  log_progress            = true
  runbook_type           = "PowerShell"
  
  content = file("${path.module}/runbooks/stop-postgresql.ps1")
  
  tags = local.common_tags
}

resource "azurerm_automation_runbook" "start_postgres" {
  name                    = "Start-PostgreSQL"
  resource_group_name     = azurerm_resource_group.main.name
  location                = azurerm_resource_group.main.location
  automation_account_name = azurerm_automation_account.main.name
  log_verbose             = true
  log_progress            = true
  runbook_type           = "PowerShell"
  
  content = file("${path.module}/runbooks/start-postgresql.ps1")
  
  tags = local.common_tags
}

# Schedule: Stop at 17:00 CET weekdays
resource "azurerm_automation_schedule" "stop_postgres" {
  name                    = "stop-postgres-17h"
  resource_group_name     = azurerm_resource_group.main.name
  automation_account_name = azurerm_automation_account.main.name
  frequency               = "Week"
  interval                = 1
  timezone                = "W. Europe Standard Time"
  start_time              = "2025-10-08T17:00:00+01:00"
  week_days               = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
}

# Schedule: Start at 09:00 CET weekdays
resource "azurerm_automation_schedule" "start_postgres" {
  name                    = "start-postgres-09h"
  resource_group_name     = azurerm_resource_group.main.name
  automation_account_name = azurerm_automation_account.main.name
  frequency               = "Week"
  interval                = 1
  timezone                = "W. Europe Standard Time"
  start_time              = "2025-10-08T09:00:00+01:00"
  week_days               = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
}

resource "azurerm_automation_job_schedule" "stop_postgres" {
  resource_group_name     = azurerm_resource_group.main.name
  automation_account_name = azurerm_automation_account.main.name
  schedule_name           = azurerm_automation_schedule.stop_postgres.name
  runbook_name            = azurerm_automation_runbook.stop_postgres.name
  
  parameters = {
    resourcegroupname = azurerm_resource_group.main.name
    servername        = azurerm_postgresql_flexible_server.main.name
  }
}

resource "azurerm_automation_job_schedule" "start_postgres" {
  resource_group_name     = azurerm_resource_group.main.name
  automation_account_name = azurerm_automation_account.main.name
  schedule_name           = azurerm_automation_schedule.start_postgres.name
  runbook_name            = azurerm_automation_runbook.start_postgres.name
  
  parameters = {
    resourcegroupname = azurerm_resource_group.main.name
    servername        = azurerm_postgresql_flexible_server.main.name
  }
}
