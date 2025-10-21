/**
 * DCSA-Compliant Document Schemas
 *
 * Defines TypeScript interfaces and validation schemas for:
 * 1. Booking Confirmation - Ocean carrier reserves space
 * 2. Bill of Lading (BOL) - Cargo loaded on vessel
 * 3. Delivery Order (DO) - Authorizes cargo release at port
 * 4. Transport Order - Trucking from port to warehouse
 */

// ============================================================================
// Common Types
// ============================================================================

export interface Location {
  UNLocationCode: string;  // e.g., NLRTM for Rotterdam
  locationName: string;
}

export interface Party {
  name: string;
  address?: string;
  contact?: string;
  taxId?: string;
}

export interface Container {
  containerNumber: string;  // 4 letters + 7 digits (e.g., OOLU3703895)
  containerType: string;    // e.g., 20GP, 40HC, 40HQ
  sealNumber?: string;
  grossWeightKg?: number;
  tareWeightKg?: number;
}

export interface Cargo {
  description: string;
  hsCode?: string;
  grossWeightKg?: number;
  volumeCbm?: number;
  numberOfPackages?: number;
  packageType?: string;
}

// ============================================================================
// Document Types
// ============================================================================

export type DocumentType = 'booking_confirmation' | 'bill_of_lading' | 'delivery_order' | 'transport_order';

export const DOCUMENT_TYPES: readonly DocumentType[] = [
  'booking_confirmation',
  'bill_of_lading',
  'delivery_order',
  'transport_order'
] as const;

// ============================================================================
// 1. Booking Confirmation
// ============================================================================

export interface BookingConfirmationData {
  documentType: 'booking_confirmation';
  bookingReference: string;
  carrierBookingReference: string;
  documentDate: string;  // ISO 8601: YYYY-MM-DD
  carrier: string;

  shipper: Party;
  consignee: Party;
  notifyParty?: Party;

  portOfLoading: Location;
  portOfDischarge: Location;
  placeOfReceipt?: Location;
  placeOfDelivery?: Location;

  vesselName?: string;
  voyageNumber?: string;
  expectedDepartureDate?: string;  // ISO 8601
  expectedArrivalDate?: string;    // ISO 8601

  containers: Container[];
  cargo: Cargo;

  serviceContract?: string;
  incoterms?: string;
  freightTerms?: 'prepaid' | 'collect';

  // Additional fields
  specialInstructions?: string;
  referenceNumbers?: {
    purchaseOrder?: string;
    salesOrder?: string;
    customsReference?: string;
  };
}

// ============================================================================
// 2. Bill of Lading
// ============================================================================

export interface BillOfLadingData {
  documentType: 'bill_of_lading';
  billOfLadingNumber: string;
  carrierBookingReference?: string;
  documentDate: string;  // ISO 8601
  carrier: string;

  shipper: Party;
  consignee: Party;
  notifyParty?: Party;

  portOfLoading: Location;
  portOfDischarge: Location;
  placeOfReceipt?: Location;
  placeOfDelivery?: Location;

  vesselName: string;
  voyageNumber: string;
  onboardDate?: string;  // ISO 8601 - when cargo loaded

  containers: Container[];
  cargo: Cargo;

  freightTerms: 'prepaid' | 'collect';
  numberOfOriginals?: number;
  shippedOnBoard?: boolean;

  // Transport document type
  transportDocumentType?: 'original' | 'seawaybill' | 'electronic';

  // Claused/Clean BL
  remarks?: string;
  isClean?: boolean;
}

// ============================================================================
// 3. Delivery Order
// ============================================================================

export interface DeliveryOrderData {
  documentType: 'delivery_order';
  deliveryOrderNumber: string;
  billOfLadingNumber?: string;
  carrierBookingReference?: string;
  issueDate: string;  // ISO 8601
  carrier: string;

  consignee: Party;
  notifyParty?: Party;

  vesselName: string;
  voyageNumber: string;
  portOfDischarge: Location;
  arrivalDate?: string;  // ISO 8601

  containers: Container[];
  cargoDescription: string;

  // Release details
  releaseAuthorization: {
    authorizedBy: string;
    authorizationDate: string;
    pinNumber?: string;
    releaseCode?: string;
  };

  // Pickup details
  pickupLocation: string;
  emptyReturnLocation?: string;
  freeTimeDays?: number;

  // Demurrage/Detention
  detentionStartDate?: string;
  demurrageRate?: number;
  detentionRate?: number;

  // Special requirements
  requiresCustomsRelease?: boolean;
  requiresQuarantineInspection?: boolean;
  specialInstructions?: string;
}

// ============================================================================
// 4. Transport Order
// ============================================================================

export interface TransportOrderData {
  documentType: 'transport_order';
  transportOrderNumber: string;
  deliveryOrderNumber?: string;
  carrierBookingReference?: string;
  orderDate: string;  // ISO 8601

  // Trucking company
  carrier: string;
  truckingCompany?: string;
  driverName?: string;
  driverContact?: string;
  licensePlate?: string;

  // Consignee/Shipper
  shipper?: Party;
  consignee: Party;

  // Route
  pickupLocation: {
    name: string;
    address: string;
    UNLocationCode?: string;
    terminalCode?: string;
  };

  deliveryLocation: {
    name: string;
    address: string;
    UNLocationCode?: string;
  };

  // Timing
  plannedPickupDate: string;  // ISO 8601
  plannedDeliveryDate: string;
  actualPickupDate?: string;
  actualDeliveryDate?: string;

  // Cargo
  containers: Container[];
  cargoDescription: string;

  // Instructions
  specialInstructions?: string;
  referenceNumbers?: {
    deliveryOrder?: string;
    billOfLading?: string;
    customsReference?: string;
  };

  // Status
  transportStatus?: 'planned' | 'in_transit' | 'delivered' | 'cancelled';
}

// ============================================================================
// Union Type for All Documents
// ============================================================================

export type DocumentData =
  | BookingConfirmationData
  | BillOfLadingData
  | DeliveryOrderData
  | TransportOrderData;

// ============================================================================
// Database Document Interface
// ============================================================================

export interface DocumentRecord {
  id: string;
  documentType: DocumentType;
  documentNumber: string;
  carrier: string;
  uploadedBy: string;
  uploadTimestamp: string;
  processingStatus: 'pending' | 'validated' | 'rejected';

  // Document-specific data (DCSA-compliant)
  data: DocumentData;

  // Extraction metadata
  extractionMetadata: {
    modelUsed: 'claude-sonnet-4.5';
    tokensUsed: number;
    processingTimeMs: number;
    confidenceScore: number;
    fewShotExamplesUsed: number;
    uncertainFields: string[];
    extractionTimestamp: string;
  };

  // Original document
  documentUrl: string;
  pageNumber: number;
  totalPages: number;

  // Validation
  validationHistory: ValidationEvent[];
}

export interface ValidationEvent {
  timestamp: string;
  validatedBy: string;
  action: 'approved' | 'rejected' | 'corrected';
  changes?: any;
  comments?: string;
}

// ============================================================================
// Knowledge Base Record
// ============================================================================

export interface KnowledgeBaseExample {
  id: string;
  documentType: DocumentType;
  carrier: string;
  documentSnippet: string;  // First 2000 chars
  extractedData: DocumentData;
  validated: boolean;
  validatedBy: string;
  validatedDate: string;
  usageCount: number;
  confidenceScore: number;
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validates container number format (4 letters + 7 digits)
 */
export function validateContainerNumber(containerNumber: string): boolean {
  const pattern = /^[A-Z]{4}[0-9]{7}$/;
  return pattern.test(containerNumber);
}

/**
 * Validates ISO 8601 date format
 */
export function validateISODate(dateString: string): boolean {
  if (!dateString) return false;
  try {
    const date = new Date(dateString);
    return !isNaN(date.getTime()) && !!dateString.match(/^\d{4}-\d{2}-\d{2}/);
  } catch {
    return false;
  }
}

/**
 * Validates UN/LOCODE format (2 letters + 3 letters/digits)
 */
export function validateUNLocationCode(code: string): boolean {
  const pattern = /^[A-Z]{2}[A-Z0-9]{3}$/;
  return pattern.test(code);
}

/**
 * Validates document data based on type
 */
export function validateDocumentData(data: DocumentData): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Common validations
  if (!data.documentType) {
    errors.push('Missing documentType');
  }

  // Type-specific validations
  switch (data.documentType) {
    case 'booking_confirmation':
      validateBookingConfirmation(data as BookingConfirmationData, errors, warnings);
      break;
    case 'bill_of_lading':
      validateBillOfLading(data as BillOfLadingData, errors, warnings);
      break;
    case 'delivery_order':
      validateDeliveryOrder(data as DeliveryOrderData, errors, warnings);
      break;
    case 'transport_order':
      validateTransportOrder(data as TransportOrderData, errors, warnings);
      break;
    default:
      errors.push(`Unknown document type: ${(data as any).documentType}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

function validateBookingConfirmation(data: BookingConfirmationData, errors: string[], warnings: string[]): void {
  if (!data.carrierBookingReference) warnings.push('Missing carrierBookingReference');
  if (!data.documentDate || !validateISODate(data.documentDate)) errors.push('Invalid documentDate');
  if (!data.carrier) warnings.push('Missing carrier');

  // Validate containers
  data.containers?.forEach((container, idx) => {
    if (container.containerNumber && !validateContainerNumber(container.containerNumber)) {
      warnings.push(`Invalid container number at index ${idx}: ${container.containerNumber}`);
    }
  });

  // Validate locations
  if (data.portOfLoading?.UNLocationCode && !validateUNLocationCode(data.portOfLoading.UNLocationCode)) {
    warnings.push(`Invalid UN/LOCODE for port of loading: ${data.portOfLoading.UNLocationCode}`);
  }
  if (data.portOfDischarge?.UNLocationCode && !validateUNLocationCode(data.portOfDischarge.UNLocationCode)) {
    warnings.push(`Invalid UN/LOCODE for port of discharge: ${data.portOfDischarge.UNLocationCode}`);
  }
}

function validateBillOfLading(data: BillOfLadingData, errors: string[], warnings: string[]): void {
  if (!data.billOfLadingNumber) errors.push('Missing billOfLadingNumber');
  if (!data.documentDate || !validateISODate(data.documentDate)) errors.push('Invalid documentDate');
  if (!data.carrier) warnings.push('Missing carrier');
  if (!data.vesselName) warnings.push('Missing vesselName');

  // Validate containers
  data.containers?.forEach((container, idx) => {
    if (container.containerNumber && !validateContainerNumber(container.containerNumber)) {
      warnings.push(`Invalid container number at index ${idx}: ${container.containerNumber}`);
    }
  });
}

function validateDeliveryOrder(data: DeliveryOrderData, errors: string[], warnings: string[]): void {
  if (!data.deliveryOrderNumber) errors.push('Missing deliveryOrderNumber');
  if (!data.issueDate || !validateISODate(data.issueDate)) errors.push('Invalid issueDate');
  if (!data.carrier) warnings.push('Missing carrier');

  // Validate containers
  data.containers?.forEach((container, idx) => {
    if (container.containerNumber && !validateContainerNumber(container.containerNumber)) {
      warnings.push(`Invalid container number at index ${idx}: ${container.containerNumber}`);
    }
  });

  if (!data.releaseAuthorization) {
    warnings.push('Missing releaseAuthorization');
  }
}

function validateTransportOrder(data: TransportOrderData, errors: string[], warnings: string[]): void {
  if (!data.transportOrderNumber) errors.push('Missing transportOrderNumber');
  if (!data.orderDate || !validateISODate(data.orderDate)) errors.push('Invalid orderDate');
  if (!data.plannedPickupDate || !validateISODate(data.plannedPickupDate)) errors.push('Invalid plannedPickupDate');
  if (!data.plannedDeliveryDate || !validateISODate(data.plannedDeliveryDate)) errors.push('Invalid plannedDeliveryDate');

  // Validate containers
  data.containers?.forEach((container, idx) => {
    if (container.containerNumber && !validateContainerNumber(container.containerNumber)) {
      warnings.push(`Invalid container number at index ${idx}: ${container.containerNumber}`);
    }
  });
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Calculates confidence score based on validation results
 */
export function calculateConfidenceScore(validationResult: ValidationResult, uncertainFields: string[] = []): number {
  if (!validationResult.valid) {
    return 0.5;  // Low confidence if validation failed
  }

  const errorCount = validationResult.errors.length;
  const warningCount = validationResult.warnings.length;
  const uncertainCount = uncertainFields.length;

  // Start at 1.0, deduct for issues
  let score = 1.0;
  score -= errorCount * 0.2;
  score -= warningCount * 0.05;
  score -= uncertainCount * 0.03;

  return Math.max(0.0, Math.min(1.0, score));
}

/**
 * Gets JSON schema for Claude prompt based on document type
 */
export function getJSONSchema(documentType: DocumentType): object {
  switch (documentType) {
    case 'booking_confirmation':
      return {
        documentType: 'booking_confirmation',
        carrierBookingReference: 'string',
        bookingReference: 'string',
        documentDate: 'YYYY-MM-DD',
        carrier: 'string',
        shipper: {
          name: 'string',
          address: 'string',
          contact: 'string (optional)'
        },
        consignee: {
          name: 'string',
          address: 'string',
          contact: 'string (optional)'
        },
        portOfLoading: {
          UNLocationCode: 'string (e.g., USNYC)',
          locationName: 'string'
        },
        portOfDischarge: {
          UNLocationCode: 'string',
          locationName: 'string'
        },
        vesselName: 'string (optional)',
        voyageNumber: 'string (optional)',
        expectedDepartureDate: 'YYYY-MM-DD (optional)',
        expectedArrivalDate: 'YYYY-MM-DD (optional)',
        containers: [
          {
            containerNumber: 'string (4 letters + 7 digits)',
            containerType: 'string (e.g., 20GP, 40HC)',
            sealNumber: 'string (optional)'
          }
        ],
        cargo: {
          description: 'string',
          hsCode: 'string (optional)',
          grossWeightKg: 'number (optional)',
          volumeCbm: 'number (optional)',
          numberOfPackages: 'number (optional)'
        },
        serviceContract: 'string (optional)',
        incoterms: 'string (optional)'
      };

    case 'bill_of_lading':
      return {
        documentType: 'bill_of_lading',
        billOfLadingNumber: 'string',
        carrierBookingReference: 'string (optional)',
        documentDate: 'YYYY-MM-DD',
        carrier: 'string',
        shipper: { name: 'string', address: 'string' },
        consignee: { name: 'string', address: 'string' },
        portOfLoading: { UNLocationCode: 'string', locationName: 'string' },
        portOfDischarge: { UNLocationCode: 'string', locationName: 'string' },
        vesselName: 'string',
        voyageNumber: 'string',
        onboardDate: 'YYYY-MM-DD (optional)',
        containers: [{ containerNumber: 'string', containerType: 'string', sealNumber: 'string (optional)', grossWeightKg: 'number (optional)' }],
        cargo: { description: 'string', grossWeightKg: 'number (optional)', volumeCbm: 'number (optional)' },
        freightTerms: 'prepaid or collect',
        numberOfOriginals: 'number (optional)'
      };

    case 'delivery_order':
      return {
        documentType: 'delivery_order',
        deliveryOrderNumber: 'string',
        billOfLadingNumber: 'string (optional)',
        carrierBookingReference: 'string (optional)',
        issueDate: 'YYYY-MM-DD',
        carrier: 'string',
        consignee: { name: 'string', address: 'string' },
        vesselName: 'string',
        voyageNumber: 'string',
        portOfDischarge: { UNLocationCode: 'string', locationName: 'string' },
        arrivalDate: 'YYYY-MM-DD (optional)',
        containers: [{ containerNumber: 'string', containerType: 'string', grossWeightKg: 'number (optional)' }],
        cargoDescription: 'string',
        releaseAuthorization: {
          authorizedBy: 'string',
          authorizationDate: 'YYYY-MM-DD',
          pinNumber: 'string (optional)',
          releaseCode: 'string (optional)'
        },
        pickupLocation: 'string',
        emptyReturnLocation: 'string (optional)',
        freeTimeDays: 'number (optional)'
      };

    case 'transport_order':
      return {
        documentType: 'transport_order',
        transportOrderNumber: 'string',
        deliveryOrderNumber: 'string (optional)',
        carrierBookingReference: 'string (optional)',
        orderDate: 'YYYY-MM-DD',
        carrier: 'string',
        truckingCompany: 'string (optional)',
        consignee: { name: 'string', address: 'string' },
        pickupLocation: { name: 'string', address: 'string', terminalCode: 'string (optional)' },
        deliveryLocation: { name: 'string', address: 'string' },
        plannedPickupDate: 'YYYY-MM-DD',
        plannedDeliveryDate: 'YYYY-MM-DD',
        containers: [{ containerNumber: 'string', containerType: 'string' }],
        cargoDescription: 'string',
        specialInstructions: 'string (optional)'
      };

    default:
      return {};
  }
}
