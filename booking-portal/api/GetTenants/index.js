"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cosmos_1 = require("@azure/cosmos");
const auth_1 = require("../shared/auth");
// Environment variables
const COSMOS_ENDPOINT = process.env.COSMOS_DB_ENDPOINT || process.env.COSMOS_ENDPOINT;
const COSMOS_KEY = process.env.COSMOS_DB_KEY;
const COSMOS_DATABASE_NAME = process.env.COSMOS_DATABASE_NAME || 'booking-portal';
const TENANT_CONTAINER_NAME = 'tenant-config';
const httpTrigger = async function (context, req) {
    context.log('GetTenants triggered');
    try {
        // Authenticate user
        const user = await (0, auth_1.getUserFromRequest)(context, req);
        if (!user) {
            context.res = {
                status: 401,
                body: { error: 'Unauthorized', message: 'Valid authentication token required' }
            };
            return;
        }
        context.log(`Authenticated user: ${user.email}`);
        // Validate environment variables
        if (!COSMOS_ENDPOINT || !COSMOS_KEY) {
            throw new Error('Cosmos DB credentials not configured');
        }
        const cosmosClient = new cosmos_1.CosmosClient({
            endpoint: COSMOS_ENDPOINT,
            key: COSMOS_KEY
        });
        const database = cosmosClient.database(COSMOS_DATABASE_NAME);
        const container = database.container(TENANT_CONTAINER_NAME);
        // Query all active tenants
        const querySpec = {
            query: "SELECT c.id, c.tenantId, c.organizationName, c.terminalName, c.active, c.configuration FROM c WHERE c.active = true ORDER BY c.organizationName"
        };
        let tenants;
        try {
            const { resources } = await container.items
                .query(querySpec)
                .fetchAll();
            tenants = resources;
            context.log(`Retrieved ${tenants.length} tenants from Cosmos DB`);
        }
        catch (dbError) {
            // If container doesn't exist yet, return default tenants
            context.log.warn('Tenant container not found, returning default tenants');
            tenants = [
                {
                    id: 'itg-hengelo',
                    tenantId: 'itg-hengelo',
                    organizationName: 'ITG',
                    terminalName: 'ITG Hengelo',
                    active: true,
                    configuration: {
                        allowedCarriers: ['OOCL', 'MAEU', 'MSC'],
                        defaultTransportMode: 'barge'
                    }
                },
                {
                    id: 'demo-terminal',
                    tenantId: 'demo-terminal',
                    organizationName: 'Demo',
                    terminalName: 'Demo Terminal',
                    active: true,
                    configuration: {
                        allowedCarriers: ['ALL'],
                        defaultTransportMode: 'barge'
                    }
                }
            ];
        }
        context.res = {
            status: 200,
            body: tenants,
            headers: {
                'Content-Type': 'application/json'
            }
        };
    }
    catch (error) {
        context.log.error('Error in GetTenants:', error);
        context.res = {
            status: 500,
            body: { error: 'Internal server error', message: error.message },
            headers: {
                'Content-Type': 'application/json'
            }
        };
    }
};
exports.default = httpTrigger;
//# sourceMappingURL=index.js.map