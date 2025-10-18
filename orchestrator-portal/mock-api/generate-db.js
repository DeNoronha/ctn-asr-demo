// Generate db.json for json-server mock API

const fs = require("fs");
const path = require("path");

// Import data generators
const tenants = require("./data/tenants");
const orchestrations = require("./data/orchestrations");
const generateEvents = require("./data/events");
const webhooks = require("./data/webhooks");

// Generate all data
const db = {
	tenants,
	orchestrations,
	events: generateEvents(orchestrations),
	webhooks,
};

// Write to db.json
const dbPath = path.join(__dirname, "db.json");
fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));

console.log("Mock database generated successfully!");
console.log("-----------------------------------");
console.log(`Tenants: ${db.tenants.length}`);
console.log(`Orchestrations: ${db.orchestrations.length}`);
console.log(
	`  - Root orchestrations: ${db.orchestrations.filter((o) => !o.parentOrchestrationId).length}`,
);
console.log(
	`  - Child orchestrations: ${db.orchestrations.filter((o) => o.parentOrchestrationId).length}`,
);
console.log(`Events: ${db.events.length}`);
console.log(`Webhooks: ${db.webhooks.length}`);
console.log("-----------------------------------");
console.log(`Database file: ${dbPath}`);
