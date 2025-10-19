export interface Tenant {
  id: string;
  tenantId: string;
  organizationId: string;
  organizationName: string;
  terminalCode: string;
  terminalName: string;
  subscription: SubscriptionInfo;
  settings: TenantSettings;
  features: TenantFeatures;
  users: TenantUser[];
  modelConfig: ModelConfig;
}

export interface SubscriptionInfo {
  type: 'saas' | 'self-hosted';
  status: 'active' | 'suspended' | 'trial';
  monthlyFee: number;
  currency: string;
  billingContact?: string;
  startDate: string;
  renewalDate?: string;
}

export interface TenantSettings {
  emailIngestion?: string;
  autoApproveThreshold: number;
  supportedCarriers: string[];
  notificationEmail?: string;
  orchestrationApiEndpoint?: string;
  orchestrationApiKey?: string;
}

export interface TenantFeatures {
  emailIngestion: boolean;
  bulkUpload: boolean;
  apiAccess: boolean;
  advancedAnalytics: boolean;
  customModels: boolean;
}

export interface TenantUser {
  userId: string;
  displayName: string;
  role: 'admin' | 'data-steward' | 'viewer' | 'api-user';
  addedDate: string;
}

export interface ModelConfig {
  useSharedModel: boolean;
  customModelId?: string;
  trainingDataCount: number;
  lastTrainingDate?: string;
}
