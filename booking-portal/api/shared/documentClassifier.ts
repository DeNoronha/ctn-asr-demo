/**
 * Document Classification Service
 *
 * Classifies shipping documents by type and detects carrier
 * Uses keyword-based approach for fast, reliable classification
 */

import { DocumentType } from './dcsaSchemas';

export interface ClassificationResult {
  documentType: DocumentType | 'unknown';
  carrier: string;
  confidence: number;
  matchedKeywords: string[];
}

// ============================================================================
// Document Type Keywords
// ============================================================================

const DOCUMENT_TYPE_KEYWORDS: Record<DocumentType, string[]> = {
  booking_confirmation: [
    'booking confirmation',
    'booking reference',
    'confirmed booking',
    'booking number',
    'space allocation',
    'booking accepted',
    'booking details',
    'container booking',
    'reservation confirmed'
  ],
  bill_of_lading: [
    'bill of lading',
    'b/l no',
    'bl no',
    'ocean bill of lading',
    'shipped on board',
    'laden on board',
    'received for shipment',
    'house bill of lading',
    'master bill of lading',
    'original bill of lading'
  ],
  delivery_order: [
    'delivery order',
    'd/o no',
    'release order',
    'cargo release',
    'container release',
    'pick up authorization',
    'pin release',
    'delivery authorization',
    'release note',
    'container pickup'
  ],
  transport_order: [
    'transport order',
    'trucking order',
    'haulage order',
    'transport instruction',
    'drayage order',
    'inland transport',
    'truck order',
    'transport reference',
    'delivery instruction',
    'pickup instruction'
  ]
};

// ============================================================================
// Carrier Keywords
// ============================================================================

const CARRIER_KEYWORDS: Record<string, string[]> = {
  maersk: [
    'maersk',
    'maeu',
    'a.p. moller',
    'safmarine',
    'seago',
    'sealand'
  ],
  msc: [
    'msc',
    'mediterranean shipping',
    'mediterranean shg',
    'mscu'
  ],
  oocl: [
    'oocl',
    'orient overseas',
    'oolu'
  ],
  cma: [
    'cma cgm',
    'cma-cgm',
    'cmdu',
    'anl'
  ],
  hapag: [
    'hapag',
    'hapag-lloyd',
    'hapag lloyd',
    'hlcu'
  ],
  cosco: [
    'cosco',
    'china cosco',
    'cosco shipping',
    'cosu'
  ],
  evergreen: [
    'evergreen',
    'evergreen marine',
    'evergreen line',
    'eisu'
  ],
  one: [
    'ocean network express',
    'one line',
    'oney'
  ],
  hmm: [
    'hmm',
    'hyundai merchant marine',
    'hyundai mm',
    'hdmu'
  ],
  yangming: [
    'yang ming',
    'yang-ming',
    'yangming',
    'ymlu'
  ],
  zim: [
    'zim',
    'zim integrated',
    'zimu'
  ],
  pil: [
    'pil',
    'pacific international',
    'pacific int\'l',
    'pciu'
  ]
};

// ============================================================================
// Classification Functions
// ============================================================================

/**
 * Classifies document type based on text content
 */
export function classifyDocumentType(text: string): { type: DocumentType | 'unknown'; confidence: number; matches: string[] } {
  const normalizedText = text.toLowerCase();
  const scores: Record<string, { score: number; matches: string[] }> = {};

  // Score each document type
  for (const [docType, keywords] of Object.entries(DOCUMENT_TYPE_KEYWORDS)) {
    const matches: string[] = [];
    let score = 0;

    for (const keyword of keywords) {
      if (normalizedText.includes(keyword.toLowerCase())) {
        matches.push(keyword);
        // Weight primary keywords higher
        score += keyword.includes('confirmation') || keyword.includes('bill of lading') ? 2 : 1;
      }
    }

    if (matches.length > 0) {
      scores[docType] = { score, matches };
    }
  }

  // Find highest scoring type
  let bestType: DocumentType | 'unknown' = 'unknown';
  let bestScore = 0;
  let bestMatches: string[] = [];

  for (const [docType, { score, matches }] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestType = docType as DocumentType;
      bestMatches = matches;
    }
  }

  // Calculate confidence (0-1)
  const maxPossibleScore = 10;  // Reasonable upper bound
  const confidence = Math.min(bestScore / maxPossibleScore, 1.0);

  return {
    type: bestType,
    confidence,
    matches: bestMatches
  };
}

/**
 * Detects carrier from text content
 */
export function detectCarrier(text: string): { carrier: string; confidence: number; matches: string[] } {
  const normalizedText = text.toLowerCase();
  const scores: Record<string, { score: number; matches: string[] }> = {};

  // Score each carrier
  for (const [carrier, keywords] of Object.entries(CARRIER_KEYWORDS)) {
    const matches: string[] = [];
    let score = 0;

    for (const keyword of keywords) {
      const keywordLower = keyword.toLowerCase();
      const occurrences = countOccurrences(normalizedText, keywordLower);

      if (occurrences > 0) {
        matches.push(keyword);
        // Weight container prefixes (e.g., MAEU, OOLU) higher as they're more specific
        const isContainerPrefix = keyword.length === 4 && keyword.toUpperCase() === keyword;
        score += occurrences * (isContainerPrefix ? 3 : 1);
      }
    }

    if (matches.length > 0) {
      scores[carrier] = { score, matches };
    }
  }

  // Find highest scoring carrier
  let bestCarrier = 'unknown';
  let bestScore = 0;
  let bestMatches: string[] = [];

  for (const [carrier, { score, matches }] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestCarrier = carrier;
      bestMatches = matches;
    }
  }

  // Calculate confidence
  const maxPossibleScore = 15;
  const confidence = Math.min(bestScore / maxPossibleScore, 1.0);

  return {
    carrier: bestCarrier,
    confidence,
    matches: bestMatches
  };
}

/**
 * Performs complete document classification
 */
export function classifyDocument(text: string): ClassificationResult {
  const typeResult = classifyDocumentType(text);
  const carrierResult = detectCarrier(text);

  // Combined confidence (weighted average)
  const combinedConfidence = (typeResult.confidence * 0.6) + (carrierResult.confidence * 0.4);

  return {
    documentType: typeResult.type,
    carrier: carrierResult.carrier,
    confidence: combinedConfidence,
    matchedKeywords: [...typeResult.matches, ...carrierResult.matches]
  };
}

/**
 * Counts occurrences of a substring in text
 */
function countOccurrences(text: string, substring: string): number {
  let count = 0;
  let position = 0;

  while ((position = text.indexOf(substring, position)) !== -1) {
    count++;
    position += substring.length;
  }

  return count;
}

/**
 * Extracts document number based on type
 */
export function extractDocumentNumber(text: string, documentType: DocumentType | 'unknown'): string | null {
  const patterns: Record<DocumentType | 'unknown', RegExp[]> = {
    booking_confirmation: [
      /booking\s+(?:no|number|ref|reference)[:\s#]*([A-Z0-9\-]+)/i,
      /booking[:\s]+([A-Z]{4}\d{6,})/i,
      /confirmation\s+(?:no|number)[:\s]*([A-Z0-9\-]+)/i
    ],
    bill_of_lading: [
      /b\/?l\s+(?:no|number)[:\s#]*([A-Z0-9\-]+)/i,
      /bill of lading[:\s]+([A-Z0-9\-]+)/i,
      /bl[:\s]+([A-Z]{4}\d{6,})/i
    ],
    delivery_order: [
      /d\/?o\s+(?:no|number)[:\s#]*([A-Z0-9\-]+)/i,
      /delivery order[:\s]+([A-Z0-9\-]+)/i,
      /release[:\s]+([A-Z0-9\-]+)/i,
      /pin[:\s]+([A-Z0-9]{4,})/i
    ],
    transport_order: [
      /transport\s+(?:order|no|number)[:\s#]*([A-Z0-9\-]+)/i,
      /trucking\s+(?:order|no)[:\s]*([A-Z0-9\-]+)/i,
      /order[:\s]+([A-Z]{2,4}\d{6,})/i
    ],
    unknown: [
      /(?:no|number|ref|reference)[:\s#]*([A-Z0-9\-]{6,})/i
    ]
  };

  const docPatterns = patterns[documentType] || patterns.unknown;

  for (const pattern of docPatterns) {
    const match = pattern.exec(text);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return null;
}

/**
 * Extracts container numbers from text
 */
export function extractContainerNumbers(text: string): string[] {
  // Container number format: 4 letters + 7 digits
  const pattern = /\b([A-Z]{4}\d{7})\b/g;
  const matches = text.match(pattern);

  if (!matches) return [];

  // Remove duplicates and validate
  return Array.from(new Set(matches)).filter(isValidContainerNumber);
}

/**
 * Validates container number using check digit algorithm
 */
function isValidContainerNumber(containerNumber: string): boolean {
  if (!/^[A-Z]{4}\d{7}$/.test(containerNumber)) {
    return false;
  }

  // ISO 6346 check digit validation
  const letters = containerNumber.substring(0, 4);
  const digits = containerNumber.substring(4, 10);
  const checkDigit = parseInt(containerNumber.substring(10, 11));

  // Convert letters to numbers (A=10, B=12, C=13, etc.)
  const letterValues: Record<string, number> = {
    A: 10, B: 12, C: 13, D: 14, E: 15, F: 16, G: 17, H: 18, I: 19, J: 20,
    K: 21, L: 23, M: 24, N: 25, O: 26, P: 27, Q: 28, R: 29, S: 30, T: 31,
    U: 32, V: 34, W: 35, X: 36, Y: 37, Z: 38
  };

  let sum = 0;
  for (let i = 0; i < 4; i++) {
    const value = letterValues[letters[i]];
    sum += value * Math.pow(2, i);
  }

  for (let i = 0; i < 6; i++) {
    sum += parseInt(digits[i]) * Math.pow(2, i + 4);
  }

  // FIXED: ISO 6346 correct check digit algorithm
  // If sum % 11 == 10, check digit is 0, otherwise it's sum % 11
  const remainder = sum % 11;
  const calculatedCheckDigit = remainder === 10 ? 0 : remainder;
  return calculatedCheckDigit === checkDigit;
}

/**
 * Extracts dates from text (common formats)
 */
export function extractDates(text: string): string[] {
  const datePatterns = [
    /\b(\d{4}-\d{2}-\d{2})\b/g,  // ISO: 2024-10-21
    /\b(\d{2}\/\d{2}\/\d{4})\b/g,  // US: 10/21/2024
    /\b(\d{2}-\d{2}-\d{4})\b/g,  // EU: 21-10-2024
    /\b(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})\b/gi  // 21 Oct 2024
  ];

  const dates: string[] = [];

  for (const pattern of datePatterns) {
    const matches = text.match(pattern);
    if (matches) {
      dates.push(...matches);
    }
  }

  return Array.from(new Set(dates));
}

/**
 * Gets confidence threshold for classification
 */
export function getConfidenceThreshold(documentType: DocumentType | 'unknown'): number {
  // Different document types may have different thresholds
  const thresholds: Record<DocumentType | 'unknown', number> = {
    booking_confirmation: 0.6,
    bill_of_lading: 0.6,
    delivery_order: 0.5,  // Lower threshold as DOs have more variation
    transport_order: 0.5,
    unknown: 0.3
  };

  return thresholds[documentType] || 0.5;
}

/**
 * Checks if classification meets confidence threshold
 */
export function meetsConfidenceThreshold(result: ClassificationResult): boolean {
  const threshold = getConfidenceThreshold(result.documentType);
  return result.confidence >= threshold;
}
