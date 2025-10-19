import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";

export async function GetTenants(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`GetTenants triggered`);

    try {
        const mockTenants = [
            {
                id: 'demo-terminal',
                tenantId: 'demo-terminal',
                organizationId: 'demo',
                organizationName: 'Demo Organization',
                terminalCode: 'terminal',
                terminalName: 'Demo Terminal',
                subscription: {
                    type: 'saas',
                    status: 'trial',
                    monthlyFee: 0,
                    currency: 'EUR',
                    startDate: new Date().toISOString()
                },
                settings: {
                    autoApproveThreshold: 0.90,
                    supportedCarriers: ['DEMO']
                },
                features: {
                    emailIngestion: false,
                    bulkUpload: true,
                    apiAccess: true,
                    advancedAnalytics: false,
                    customModels: false
                },
                users: [],
                modelConfig: {
                    useSharedModel: true,
                    trainingDataCount: 0
                }
            }
        ];

        return {
            status: 200,
            jsonBody: mockTenants
        };

    } catch (error: any) {
        context.error('Error in GetTenants:', error);
        return {
            status: 500,
            jsonBody: { error: 'Internal server error', message: error.message }
        };
    }
}

app.http('GetTenants', {
    methods: ['GET', 'OPTIONS'],
    authLevel: 'anonymous',
    route: 'v1/tenants',
    handler: GetTenants
});
