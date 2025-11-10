"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthEndpoint = exports.OrchestrationsEndpoint = exports.AuditLogsEndpoint = exports.EndpointsEndpoint = exports.IdentifiersEndpoint = exports.ContactsEndpoint = exports.LegalEntitiesEndpoint = exports.MembersEndpoint = exports.AsrApiError = exports.AsrApiClient = void 0;
// Main API Client
var client_1 = require("./client");
Object.defineProperty(exports, "AsrApiClient", { enumerable: true, get: function () { return client_1.AsrApiClient; } });
// Type exports
__exportStar(require("./types"), exports);
// Error handling
var error_1 = require("./utils/error");
Object.defineProperty(exports, "AsrApiError", { enumerable: true, get: function () { return error_1.AsrApiError; } });
// Endpoint exports (for advanced usage)
var members_1 = require("./endpoints/members");
Object.defineProperty(exports, "MembersEndpoint", { enumerable: true, get: function () { return members_1.MembersEndpoint; } });
var legalEntities_1 = require("./endpoints/legalEntities");
Object.defineProperty(exports, "LegalEntitiesEndpoint", { enumerable: true, get: function () { return legalEntities_1.LegalEntitiesEndpoint; } });
var contacts_1 = require("./endpoints/contacts");
Object.defineProperty(exports, "ContactsEndpoint", { enumerable: true, get: function () { return contacts_1.ContactsEndpoint; } });
var identifiers_1 = require("./endpoints/identifiers");
Object.defineProperty(exports, "IdentifiersEndpoint", { enumerable: true, get: function () { return identifiers_1.IdentifiersEndpoint; } });
var endpoints_1 = require("./endpoints/endpoints");
Object.defineProperty(exports, "EndpointsEndpoint", { enumerable: true, get: function () { return endpoints_1.EndpointsEndpoint; } });
var audit_1 = require("./endpoints/audit");
Object.defineProperty(exports, "AuditLogsEndpoint", { enumerable: true, get: function () { return audit_1.AuditLogsEndpoint; } });
var orchestrations_1 = require("./endpoints/orchestrations");
Object.defineProperty(exports, "OrchestrationsEndpoint", { enumerable: true, get: function () { return orchestrations_1.OrchestrationsEndpoint; } });
var auth_1 = require("./endpoints/auth");
Object.defineProperty(exports, "AuthEndpoint", { enumerable: true, get: function () { return auth_1.AuthEndpoint; } });
