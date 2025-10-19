export interface Booking {
  id: string;
  tenantId: string;
  documentId: string;
  documentUrl: string;
  uploadedBy: string;
  uploadTimestamp: string;
  processingStatus: 'processing' | 'pending' | 'validated' | 'rejected' | 'error';
  overallConfidence: number;
  dcsaPlusData: DcsaPlusData;
  extractionMetadata: ExtractionMetadata;
  validationHistory: ValidationRecord[];
}

export interface DcsaPlusData {
  carrierBookingReference: string;
  transportDocumentReference?: string;
  shipmentDetails: ShipmentDetails;
  containers: ContainerInfo[];
  inlandExtensions: InlandExtensions;
  parties: Parties;
}

export interface ShipmentDetails {
  carrierCode: string;
  vesselName?: string;
  voyageNumber?: string;
  portOfLoading: PortInfo;
  portOfDischarge: PortInfo;
  estimatedDepartureDate?: string;
  estimatedArrivalDate?: string;
}

export interface PortInfo {
  UNLocationCode: string;
  locationName: string;
}

export interface ContainerInfo {
  containerNumber: string;
  sealNumber?: string;
  containerSize: string;
  containerType: string;
  tareWeight?: number;
  cargoWeight?: number;
}

export interface InlandExtensions {
  transportMode: 'barge' | 'truck' | 'rail' | 'multimodal';
  pickupDetails: PickupDeliveryDetails;
  deliveryDetails: PickupDeliveryDetails;
  transportLegs?: TransportLeg[];
}

export interface PickupDeliveryDetails {
  facilityName: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  pickupDate?: string;
  deliveryDate?: string;
  pinCode?: string;
  releaseReference?: string;
}

export interface TransportLeg {
  legNumber: number;
  mode: 'barge' | 'truck' | 'rail';
  origin: string;
  destination: string;
  estimatedDepartureDate?: string;
  estimatedArrivalDate?: string;
}

export interface Parties {
  shipper?: PartyInfo;
  consignee?: PartyInfo;
  notifyParty?: PartyInfo;
}

export interface PartyInfo {
  name: string;
  address?: string;
  contact?: string;
}

export interface ExtractionMetadata {
  modelId: string;
  modelVersion: string;
  confidenceScores: { [fieldPath: string]: number };
  uncertainFields: string[];
  processingTimeMs: number;
  extractionTimestamp: string;
}

export interface ValidationRecord {
  validatedBy: string;
  validatedAt: string;
  action: 'approved' | 'approved-with-corrections' | 'rejected';
  corrections: FieldCorrection[];
  timeSpentSeconds: number;
  comments?: string;
}

export interface FieldCorrection {
  field: string;
  originalValue: any;
  correctedValue: any;
  originalConfidence: number;
  correctionReason: string;
}
