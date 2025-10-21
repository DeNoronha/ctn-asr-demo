# Claude-Based Document Extraction - Implementation Plan

**Date**: October 21, 2025
**Architect**: Ramon de Noronha
**Objective**: Replace Azure Document Intelligence with Claude API for intelligent multi-document extraction

---

## Architecture Changes

### BEFORE (Azure IDP)
```
PDF Upload → Azure Document Intelligence (prebuilt-invoice) → Extract Fields → Store
```

### AFTER (Claude API)
```
PDF Upload → PDF Text Extraction → Document Classification → Claude API (with few-shot) → Validate → Store
```

---

## Supported Document Types

1. **Booking Confirmation** - Ocean carrier reserves space
2. **Bill of Lading (BOL)** - Cargo loaded on vessel
3. **Delivery Order (DO)** - Authorizes cargo release at port
4. **Transport Order** - Trucking from port to warehouse

---

## Implementation Phases

### Phase 1: Dependencies & Setup ✅
- [x] Install `@anthropic-ai/sdk`
- [x] Install `pdf-parse` for text extraction
- [x] Remove `@azure/ai-form-recognizer`
- [x] Configure environment variables

### Phase 2: Database Schema Extension ✅
- [x] Extend Cosmos DB schema for multi-document types
- [x] Add `documentType` field (booking/bol/do/transport)
- [x] Add `knowledgeBase` container for few-shot examples
- [x] Add `extractionMetadata` with Claude-specific fields

### Phase 3: Core Services ✅
- [x] Create `shared/pdfExtractor.ts` - Extract text from PDF
- [x] Create `shared/documentClassifier.ts` - Classify document type
- [x] Create `shared/claudeExtractor.ts` - Claude API integration
- [x] Create `shared/dcsaSchemas.ts` - Schemas for all 4 types
- [x] Create `shared/knowledgeBase.ts` - Few-shot example retrieval

### Phase 4: Refactor Functions ✅
- [x] Refactor `UploadDocument/index.ts` - Remove Azure IDP, add Claude
- [x] Update `GetBookings/index.ts` - Support all document types
- [x] Add `AddToKnowledgeBase/index.ts` - Store validated examples
- [ ] Update `GetBookingById/index.ts` - Return appropriate schema (optional)
- [ ] Update `ValidateBooking/index.ts` - Validation for all types (optional)

### Phase 5: Multi-Page Handling ✅
- [x] Enhance PDF extraction to detect document boundaries
- [x] Implement page-level classification
- [x] Group related pages into single documents
- [x] Handle mixed document types in one PDF

### Phase 6: Testing 🔄
- [ ] Unit tests for PDF extraction
- [ ] Unit tests for document classification
- [ ] Unit tests for Claude extraction
- [ ] Integration tests with sample PDFs
- [ ] Test all 4 document types
- [ ] Test multi-page scenarios

### Phase 7: Deployment & Validation 🔄
- [ ] Deploy to Azure Functions
- [ ] Test in production with real PDFs
- [ ] Monitor Claude API usage and costs
- [ ] Validate extraction quality

---

## Technical Decisions

### Why Remove Azure Document Intelligence?
1. **Limited domain understanding** - Generic model doesn't understand shipping context
2. **Format variations** - Requires custom training per carrier
3. **Poor accuracy** - 46% confidence on delivery orders
4. **High maintenance** - Retraining needed for format changes

### Why Claude API?
1. **Domain reasoning** - Understands shipping/logistics context
2. **Few-shot learning** - Improves with examples, no retraining
3. **Multi-document support** - Single API handles all types
4. **Self-improving** - Knowledge base grows automatically
5. **Better accuracy** - Expected >90% with good examples

---

## Database Schema Design

### Document Record
```typescript
interface Document {
  id: string;
  documentType: 'booking' | 'bol' | 'delivery_order' | 'transport_order';
  documentNumber: string;
  carrier: string;
  uploadedBy: string;
  uploadTimestamp: string;
  processingStatus: 'pending' | 'validated' | 'rejected';

  // Document-specific data (DCSA-compliant)
  data: BookingData | BOLData | DeliveryOrderData | TransportOrderData;

  // Extraction metadata
  extractionMetadata: {
    modelUsed: 'claude-sonnet-4.5';
    tokensUsed: number;
    processingTimeMs: number;
    confidenceScore: number;
    fewShotExamplesUsed: number;
    uncertainFields: string[];
  };

  // Original document
  documentUrl: string;
  pageNumber: number;
  totalPages: number;
}
```

### Knowledge Base Record
```typescript
interface KnowledgeBaseExample {
  id: string;
  documentType: string;
  carrier: string;
  documentSnippet: string; // First 2000 chars
  extractedData: object; // Validated extraction
  validated: boolean;
  validatedBy: string;
  validatedDate: string;
  usageCount: number; // Track how often used
  confidenceScore: number;
}
```

---

## DCSA Schema Mappings

### Booking Confirmation
- Carrier booking reference
- Shipper/Consignee details
- Port of loading/discharge
- Vessel/voyage info
- Container details
- Cargo description

### Bill of Lading
- BOL number
- Shipper/consignee
- Vessel/voyage
- Ports
- Container/seal numbers
- Cargo weight/volume

### Delivery Order
- DO number
- BOL reference
- Port of discharge
- Release authorization
- Container details
- Pickup/return locations

### Transport Order
- Transport order number
- Pickup location (port terminal)
- Delivery location (warehouse)
- Container details
- Trucking company
- Planned pickup/delivery dates

---

## Cost Estimation

### Claude API Costs
- **Sonnet 4.5**: $3/M input tokens, $15/M output tokens
- **Avg document**: 8K input + 1.5K output = $0.043/document
- **1000 docs/month**: ~€40/month

### vs Azure Document Intelligence
- **S0 tier**: €10/1000 pages + custom model training costs
- **Custom models**: Requires retraining for each carrier/format
- **Total**: Higher long-term costs with lower accuracy

---

## Risk Mitigation

### Risk: Claude API downtime
**Mitigation**: Implement retry logic, queue failed extractions

### Risk: Hallucinated data
**Mitigation**: Strict validation layer, confidence scoring

### Risk: High costs
**Mitigation**: Monitor usage, implement cost alerts, cache results

### Risk: Privacy concerns
**Mitigation**: Claude doesn't train on API data, EU region deployment

---

## Success Metrics

| Metric | Target | Current (Azure IDP) |
|--------|--------|---------------------|
| Extraction accuracy | >90% | 46% |
| Processing time | <30s | ~15s |
| Auto-validation rate | >80% | ~20% |
| Cost per document | <€0.10 | €0.01 |
| Support for doc types | 4 | 1 |

---

## Timeline

- **Hours 0-2**: Dependencies, database schema, core services
- **Hours 2-4**: Refactor UploadDocument, implement Claude extraction
- **Hours 4-6**: Multi-page handling, document classification
- **Hours 6-7**: Testing, agent invocations
- **Hours 7-8**: Deployment, validation, documentation

**Total**: 8 hours overnight work

---

## Next Steps

1. Install dependencies
2. Create core extraction services
3. Refactor UploadDocument function
4. Test with all 4 document types
5. Deploy to production
