"use strict";
/**
 * Claude API Extraction Service
 *
 * Integrates with Anthropic Claude API for intelligent document extraction
 * Uses few-shot learning with examples from knowledge base
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractWithClaude = extractWithClaude;
exports.extractWithRetry = extractWithRetry;
exports.extractBatch = extractBatch;
exports.estimateExtractionCost = estimateExtractionCost;
exports.validateAPIKey = validateAPIKey;
exports.testClaudeConnection = testClaudeConnection;
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const dcsaSchemas_1 = require("./dcsaSchemas");
/**
 * Extracts structured data from document text using Claude API
 */
async function extractWithClaude(request) {
    const startTime = Date.now();
    // Initialize Claude client
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
        throw new Error('ANTHROPIC_API_KEY environment variable not set');
    }
    const client = new sdk_1.default({
        apiKey: apiKey
    });
    // Build prompt with few-shot examples
    const prompt = buildExtractionPrompt(request.text, request.documentType, request.fewShotExamples || []);
    try {
        // Call Claude API
        const message = await client.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 4000,
            temperature: 0, // Deterministic for data extraction
            messages: [
                {
                    role: 'user',
                    content: prompt
                }
            ]
        });
        const processingTimeMs = Date.now() - startTime;
        // Extract response text
        const responseText = message.content
            .filter((block) => block.type === 'text')
            .map(block => block.text)
            .join('\n');
        // Parse JSON response
        const extractedData = parseClaudeResponse(responseText, request.documentType);
        // Validate extraction
        const validation = (0, dcsaSchemas_1.validateDocumentData)(extractedData);
        // Identify uncertain fields (fields that are null or empty)
        const uncertainFields = findUncertainFields(extractedData);
        // Calculate confidence score
        const confidenceScore = (0, dcsaSchemas_1.calculateConfidenceScore)(validation, uncertainFields);
        return {
            data: extractedData,
            validation,
            confidenceScore,
            metadata: {
                modelUsed: 'claude-sonnet-4.5',
                tokensUsed: message.usage.input_tokens + message.usage.output_tokens,
                processingTimeMs,
                fewShotExamplesUsed: request.fewShotExamples?.length || 0,
                uncertainFields,
                extractionTimestamp: new Date().toISOString()
            }
        };
    }
    catch (error) {
        throw new Error(`Claude extraction failed: ${error.message}`);
    }
}
/**
 * Builds Claude prompt with few-shot examples
 */
function buildExtractionPrompt(documentText, documentType, examples) {
    const schema = (0, dcsaSchemas_1.getJSONSchema)(documentType);
    let prompt = `You are an expert at extracting structured data from shipping documents.

Document Type: ${documentType}

Extract the following fields according to the DCSA standard and return ONLY valid JSON with no other text:

${JSON.stringify(schema, null, 2)}

`;
    // Add few-shot examples if available
    if (examples.length > 0) {
        prompt += `Here are ${examples.length} examples of previous extractions from similar documents:\n\n`;
        examples.forEach((example, idx) => {
            prompt += `--- Example ${idx + 1} ---\n`;
            prompt += `Document snippet:\n${example.documentSnippet.substring(0, 500)}...\n\n`;
            prompt += `Extracted data:\n${JSON.stringify(example.extractedData, null, 2)}\n\n`;
        });
    }
    prompt += `--- Now extract from this document ---

Document text:
${documentText}

CRITICAL INSTRUCTIONS:
1. Return ONLY valid JSON matching the schema above
2. Use null for missing fields - do NOT make up data
3. Use ISO 8601 format for dates (YYYY-MM-DD)
4. Validate container numbers (4 letters + 7 digits, e.g., OOLU3703895)
5. Use UN/LOCODE format for ports when possible (e.g., NLRTM for Rotterdam)
6. If a field cannot be extracted with confidence, use null
7. Extract ALL container numbers found in the document
8. Be precise with party names and addresses
9. Look for document numbers in headers and reference sections
10. Preserve exact spelling of company names and locations

Return the JSON now:`;
    return prompt;
}
/**
 * Parses Claude's response and extracts JSON
 */
function parseClaudeResponse(responseText, documentType) {
    try {
        // Try direct JSON parse first
        const parsed = JSON.parse(responseText);
        parsed.documentType = documentType; // Ensure type is set
        return parsed;
    }
    catch (error) {
        // Try to extract JSON from markdown code blocks
        const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch && jsonMatch[1]) {
            const parsed = JSON.parse(jsonMatch[1]);
            parsed.documentType = documentType;
            return parsed;
        }
        // Try to extract JSON from curly braces
        const objectMatch = responseText.match(/\{[\s\S]*\}/);
        if (objectMatch) {
            const parsed = JSON.parse(objectMatch[0]);
            parsed.documentType = documentType;
            return parsed;
        }
        throw new Error('Could not parse JSON from Claude response');
    }
}
/**
 * Identifies uncertain fields (null or empty values)
 */
function findUncertainFields(data, prefix = '') {
    const uncertainFields = [];
    for (const [key, value] of Object.entries(data)) {
        const fieldPath = prefix ? `${prefix}.${key}` : key;
        if (value === null || value === undefined || value === '') {
            uncertainFields.push(fieldPath);
        }
        else if (typeof value === 'object' && !Array.isArray(value)) {
            // Recursively check nested objects
            uncertainFields.push(...findUncertainFields(value, fieldPath));
        }
        else if (Array.isArray(value) && value.length === 0) {
            uncertainFields.push(fieldPath);
        }
    }
    return uncertainFields;
}
/**
 * Retries extraction with adjusted prompt if confidence is low
 */
async function extractWithRetry(request, maxRetries = 2) {
    let lastResult = null;
    let lastError = null;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const result = await extractWithClaude(request);
            // If confidence is high enough, return immediately
            if (result.confidenceScore >= 0.85) {
                return result;
            }
            lastResult = result;
            // If this is not the last attempt, try again with more specific instructions
            if (attempt < maxRetries) {
                // Add more examples if available
                // (In production, fetch more examples from knowledge base)
                continue;
            }
        }
        catch (error) {
            lastError = error;
            if (attempt < maxRetries) {
                // Wait briefly before retry
                await new Promise(resolve => setTimeout(resolve, 1000));
                continue;
            }
        }
    }
    // If we have a result (even low confidence), return it
    if (lastResult) {
        return lastResult;
    }
    // Otherwise throw the last error
    throw lastError || new Error('Extraction failed after retries');
}
/**
 * Batch extraction for multiple documents
 */
async function extractBatch(requests) {
    const results = [];
    // Process sequentially to avoid rate limits
    for (const request of requests) {
        try {
            const result = await extractWithClaude(request);
            results.push(result);
        }
        catch (error) {
            // Continue with other documents even if one fails
            console.error(`Failed to extract document: ${error.message}`);
        }
    }
    return results;
}
/**
 * Estimates cost for extraction
 */
function estimateExtractionCost(textLength, examplesCount) {
    // Claude Sonnet 4.5 pricing (as of Oct 2024)
    const INPUT_COST_PER_1M_TOKENS = 3.0; // USD
    const OUTPUT_COST_PER_1M_TOKENS = 15.0; // USD
    // Rough estimate: 1 token ≈ 4 characters
    const estimatedInputTokens = (textLength + (examplesCount * 2000)) / 4 + 500; // +500 for schema/instructions
    const estimatedOutputTokens = 1500; // Typical output size
    const inputCost = (estimatedInputTokens / 1000000) * INPUT_COST_PER_1M_TOKENS;
    const outputCost = (estimatedOutputTokens / 1000000) * OUTPUT_COST_PER_1M_TOKENS;
    return inputCost + outputCost; // In USD
}
/**
 * Validates API key is configured
 */
function validateAPIKey() {
    return !!process.env.ANTHROPIC_API_KEY;
}
/**
 * Tests Claude API connection
 */
async function testClaudeConnection() {
    try {
        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) {
            return false;
        }
        const client = new sdk_1.default({ apiKey });
        // Simple test message
        const message = await client.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 10,
            messages: [
                {
                    role: 'user',
                    content: 'Say "OK"'
                }
            ]
        });
        return message.content.length > 0;
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=claudeExtractor.js.map