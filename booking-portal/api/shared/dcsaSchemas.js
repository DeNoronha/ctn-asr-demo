"use strict";
/**
 * DCSA-Compliant Document Schemas
 *
 * Defines TypeScript interfaces and validation schemas for:
 * 1. Booking Confirmation - Ocean carrier reserves space
 * 2. Bill of Lading (BOL) - Cargo loaded on vessel
 * 3. Delivery Order (DO) - Authorizes cargo release at port
 * 4. Transport Order - Trucking from port to warehouse
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DOCUMENT_TYPES = void 0;
exports.validateContainerNumber = validateContainerNumber;
exports.validateISODate = validateISODate;
exports.validateUNLocationCode = validateUNLocationCode;
exports.validateDocumentData = validateDocumentData;
exports.calculateConfidenceScore = calculateConfidenceScore;
exports.getJSONSchema = getJSONSchema;
exports.DOCUMENT_TYPES = [
    'booking_confirmation',
    'bill_of_lading',
    'delivery_order',
    'transport_order'
];
// ============================================================================
// Validation Functions
// ============================================================================
/**
 * Validates container number format (4 letters + 7 digits)
 */
function validateContainerNumber(containerNumber) {
    const pattern = /^[A-Z]{4}[0-9]{7}$/;
    return pattern.test(containerNumber);
}
/**
 * Validates ISO 8601 date format
 */
function validateISODate(dateString) {
    if (!dateString)
        return false;
    try {
        const date = new Date(dateString);
        return !isNaN(date.getTime()) && !!dateString.match(/^\d{4}-\d{2}-\d{2}/);
    }
    catch {
        return false;
    }
}
/**
 * Validates UN/LOCODE format (2 letters + 3 letters/digits)
 */
function validateUNLocationCode(code) {
    const pattern = /^[A-Z]{2}[A-Z0-9]{3}$/;
    return pattern.test(code);
}
/**
 * Validates document data based on type
 */
function validateDocumentData(data) {
    const errors = [];
    const warnings = [];
    // Common validations
    if (!data.documentType) {
        errors.push('Missing documentType');
    }
    // Type-specific validations
    switch (data.documentType) {
        case 'booking_confirmation':
            validateBookingConfirmation(data, errors, warnings);
            break;
        case 'bill_of_lading':
            validateBillOfLading(data, errors, warnings);
            break;
        case 'delivery_order':
            validateDeliveryOrder(data, errors, warnings);
            break;
        case 'transport_order':
            validateTransportOrder(data, errors, warnings);
            break;
        default:
            errors.push(`Unknown document type: ${data.documentType}`);
    }
    return {
        valid: errors.length === 0,
        errors,
        warnings
    };
}
function validateBookingConfirmation(data, errors, warnings) {
    if (!data.carrierBookingReference)
        warnings.push('Missing carrierBookingReference');
    if (!data.documentDate || !validateISODate(data.documentDate))
        errors.push('Invalid documentDate');
    if (!data.carrier)
        warnings.push('Missing carrier');
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
function validateBillOfLading(data, errors, warnings) {
    if (!data.billOfLadingNumber)
        errors.push('Missing billOfLadingNumber');
    if (!data.documentDate || !validateISODate(data.documentDate))
        errors.push('Invalid documentDate');
    if (!data.carrier)
        warnings.push('Missing carrier');
    if (!data.vesselName)
        warnings.push('Missing vesselName');
    // Validate containers
    data.containers?.forEach((container, idx) => {
        if (container.containerNumber && !validateContainerNumber(container.containerNumber)) {
            warnings.push(`Invalid container number at index ${idx}: ${container.containerNumber}`);
        }
    });
}
function validateDeliveryOrder(data, errors, warnings) {
    if (!data.deliveryOrderNumber)
        errors.push('Missing deliveryOrderNumber');
    if (!data.issueDate || !validateISODate(data.issueDate))
        errors.push('Invalid issueDate');
    if (!data.carrier)
        warnings.push('Missing carrier');
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
function validateTransportOrder(data, errors, warnings) {
    if (!data.transportOrderNumber)
        errors.push('Missing transportOrderNumber');
    if (!data.orderDate || !validateISODate(data.orderDate))
        errors.push('Invalid orderDate');
    if (!data.plannedPickupDate || !validateISODate(data.plannedPickupDate))
        errors.push('Invalid plannedPickupDate');
    if (!data.plannedDeliveryDate || !validateISODate(data.plannedDeliveryDate))
        errors.push('Invalid plannedDeliveryDate');
    // Validate containers
    data.containers?.forEach((container, idx) => {
        if (container.containerNumber && !validateContainerNumber(container.containerNumber)) {
            warnings.push(`Invalid container number at index ${idx}: ${container.containerNumber}`);
        }
    });
}
/**
 * Calculates confidence score based on validation results
 */
function calculateConfidenceScore(validationResult, uncertainFields = []) {
    if (!validationResult.valid) {
        return 0.5; // Low confidence if validation failed
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
function getJSONSchema(documentType) {
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
//# sourceMappingURL=dcsaSchemas.js.map