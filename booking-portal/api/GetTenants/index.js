"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const httpTrigger = async function (context, req) {
    context.log('GetTenants triggered');
    try {
        const mockTenants = [
            {
                id: 'itg-hengelo',
                tenantId: 'itg-hengelo',
                organizationName: 'ITG',
                terminalName: 'ITG Hengelo',
                subscription: {
                    type: 'saas',
                    status: 'active',
                    monthlyFee: 499
                }
            },
            {
                id: 'itv-venlo',
                tenantId: 'itv-venlo',
                organizationName: 'ITV',
                terminalName: 'ITV Venlo',
                subscription: {
                    type: 'saas',
                    status: 'trial',
                    monthlyFee: 0
                }
            }
        ];
        context.res = {
            status: 200,
            body: mockTenants,
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