# ============================================
# CTN Demo ASR - Variables
# ============================================

variable "project_prefix" {
  description = "Prefix for all resource names"
  type        = string
  default     = "ctn-demo-asr"
}

variable "environment" {
  description = "Environment name (dev, test, prod)"
  type        = string
  default     = "dev"
  
  validation {
    condition     = contains(["dev", "test", "prod"], var.environment)
    error_message = "Environment must be dev, test, or prod."
  }
}

variable "location" {
  description = "Azure region for resources"
  type        = string
  default     = "westeurope"
}

variable "tags" {
  description = "Additional tags for resources"
  type        = map(string)
  default     = {}
}

variable "admin_email" {
  description = "Email address for admin notifications"
  type        = string
  default     = "admin@ctn-demo.com"
}
