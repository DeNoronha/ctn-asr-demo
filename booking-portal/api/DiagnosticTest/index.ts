import { AzureFunction, Context, HttpRequest } from "@azure/functions";

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
    context.log('Diagnostic test endpoint triggered');

    const results: any = {
        timestamp: new Date().toISOString(),
        tests: {}
    };

    // Test 1: Environment variables
    results.tests.env = {
        ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY ? '✅ Set' : '❌ Missing',
        COSMOS_ENDPOINT: process.env.COSMOS_ENDPOINT || process.env.COSMOS_DB_ENDPOINT || '❌ Missing',
        COSMOS_DATABASE_NAME: process.env.COSMOS_DATABASE_NAME || 'booking-portal',
        COSMOS_CONTAINER_NAME: process.env.COSMOS_CONTAINER_NAME || 'bookings',
        STORAGE_ACCOUNT_NAME: process.env.STORAGE_ACCOUNT_NAME || '❌ Missing'
    };

    // Test 2: pdf-parse module
    try {
        const pdfParse = require('pdf-parse');
        results.tests.pdfParse = {
            status: '✅ Module loaded',
            type: typeof pdfParse
        };
    } catch (error: any) {
        results.tests.pdfParse = {
            status: '❌ Failed to load',
            error: error.message
        };
    }

    // Test 3: Anthropic SDK
    try {
        const Anthropic = require('@anthropic-ai/sdk');
        results.tests.anthropicSDK = {
            status: '✅ Module loaded',
            hasConstructor: typeof Anthropic === 'function'
        };
    } catch (error: any) {
        results.tests.anthropicSDK = {
            status: '❌ Failed to load',
            error: error.message
        };
    }

    // Test 4: Claude API connection (if API key exists)
    if (process.env.ANTHROPIC_API_KEY) {
        try {
            const Anthropic = require('@anthropic-ai/sdk');
            const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

            const message = await client.messages.create({
                model: 'claude-sonnet-4-5-20250929',
                max_tokens: 20,
                messages: [{ role: 'user', content: 'Say OK' }]
            });

            results.tests.claudeAPI = {
                status: '✅ API working',
                model: message.model,
                response: message.content[0]?.text
            };
        } catch (error: any) {
            results.tests.claudeAPI = {
                status: '❌ API failed',
                error: error.message,
                code: error.status
            };
        }
    }

    // Test 5: Cosmos DB connection
    if (results.tests.env.COSMOS_ENDPOINT !== '❌ Missing') {
        try {
            const { CosmosClient } = require('@azure/cosmos');
            const client = new CosmosClient({
                endpoint: process.env.COSMOS_ENDPOINT || process.env.COSMOS_DB_ENDPOINT,
                key: process.env.COSMOS_DB_KEY
            });

            const database = client.database(process.env.COSMOS_DATABASE_NAME || 'ctn-bookings-db');
            const container = database.container(process.env.COSMOS_CONTAINER_NAME || 'bookings');

            const { resources } = await container.items
                .query('SELECT TOP 1 c.id FROM c')
                .fetchAll();

            results.tests.cosmosDB = {
                status: '✅ Connection working',
                database: process.env.COSMOS_DATABASE_NAME || 'ctn-bookings-db',
                container: process.env.COSMOS_CONTAINER_NAME || 'bookings',
                sampleItemsFound: resources.length
            };
        } catch (error: any) {
            results.tests.cosmosDB = {
                status: '❌ Connection failed',
                error: error.message
            };
        }
    }

    context.res = {
        status: 200,
        body: results,
        headers: {
            'Content-Type': 'application/json'
        }
    };
};

export default httpTrigger;
