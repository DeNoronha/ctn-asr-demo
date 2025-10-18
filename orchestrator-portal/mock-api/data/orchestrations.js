// Orchestration data generator for mock API

const { addDays, subDays, formatISO } = require("date-fns");

// Helper to generate container IDs
const generateContainerId = () => {
	const prefixes = [
		"MSCU",
		"MAEU",
		"TCLU",
		"HLCU",
		"CSQU",
		"TEMU",
		"OOLU",
		"CMAU",
	];
	const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
	const number = Math.floor(1000000 + Math.random() * 9000000);
	return `${prefix}${number}`;
};

// Helper to generate BOL IDs
const generateBolId = () => {
	const year = 2025;
	const number = Math.floor(10000 + Math.random() * 90000);
	return `BOL-${year}-${number}`;
};

// Realistic locations
const locations = [
	{
		city: "Rotterdam",
		country: "Netherlands",
		terminal: "Rotterdam Container Terminal",
		code: "NLRTM",
	},
	{
		city: "Amsterdam",
		country: "Netherlands",
		terminal: "Amsterdam Port Services",
		code: "NLAMS",
	},
	{
		city: "Duisburg",
		country: "Germany",
		terminal: "Duisburg Intermodal Terminal",
		code: "DEDUI",
	},
	{
		city: "Basel",
		country: "Switzerland",
		terminal: "Basel Rheinhäfen",
		code: "CHBSL",
	},
	{
		city: "Antwerp",
		country: "Belgium",
		terminal: "Antwerp Gateway",
		code: "BEANR",
	},
	{
		city: "Hamburg",
		country: "Germany",
		terminal: "Hamburg Container Terminal",
		code: "DEHAM",
	},
	{
		city: "Cologne",
		country: "Germany",
		terminal: "Cologne Cargo Terminal",
		code: "DECGN",
	},
	{
		city: "Venlo",
		country: "Netherlands",
		terminal: "Venlo Trade Port",
		code: "NLVNL",
	},
];

// Company names for parties
const companies = {
	shippers: [
		"Global Electronics BV",
		"EuroTech Industries",
		"Benelux Manufacturing",
		"Rhine Valley Goods",
		"Continental Exports",
	],
	consignees: [
		"Swiss Distribution AG",
		"German Wholesale GmbH",
		"Alpine Imports SA",
		"Rhein-Main Trading",
		"Belgium Retail Group",
	],
	terminals: [
		"Rotterdam Container Terminal",
		"Duisburg Intermodal Terminal",
		"Basel Rheinhäfen",
		"Antwerp Gateway",
		"Hamburg Container Terminal",
	],
	forwarders: [
		"ITG Intermodal Transport",
		"EuroRail Logistics",
		"Rhine Express",
		"Continental Forwarding",
		"BeNeLux Transport",
	],
	customs: [
		"Dutch Customs Authority",
		"German Zoll Service",
		"Swiss Customs",
		"Belgium Douane",
	],
};

// Generate realistic orchestration
const generateOrchestration = (
	id,
	tenantId,
	isChild = false,
	parentId = null,
) => {
	const now = new Date();
	const daysAgo = Math.floor(Math.random() * 30);
	const createdAt = subDays(now, daysAgo);

	const origin = locations[Math.floor(Math.random() * 3)]; // Rotterdam, Amsterdam, or Antwerp
	const destination = locations[3 + Math.floor(Math.random() * 5)]; // Inland terminals

	const statuses = ["active", "completed", "cancelled", "draft", "delayed"];
	const statusWeights = isChild
		? [0.5, 0.3, 0.1, 0.05, 0.05]
		: [0.4, 0.35, 0.1, 0.1, 0.05];
	const rand = Math.random();
	let status = "active";
	let cumulative = 0;
	for (let i = 0; i < statuses.length; i++) {
		cumulative += statusWeights[i];
		if (rand < cumulative) {
			status = statuses[i];
			break;
		}
	}

	const departureDate = addDays(createdAt, Math.floor(Math.random() * 5) + 1);
	const arrivalDate = addDays(departureDate, Math.floor(Math.random() * 3) + 2);

	const orchestration = {
		id,
		tenantId,
		containerId: generateContainerId(),
		bolId: generateBolId(),
		status,
		priority:
			Math.random() > 0.8 ? "high" : Math.random() > 0.5 ? "medium" : "normal",

		route: {
			origin: {
				location: origin.city,
				country: origin.country,
				terminal: origin.terminal,
				unLocode: origin.code,
			},
			destination: {
				location: destination.city,
				country: destination.country,
				terminal: destination.terminal,
				unLocode: destination.code,
			},
		},

		timeWindow: {
			start: formatISO(departureDate),
			end: formatISO(arrivalDate),
			estimatedDeparture: formatISO(departureDate),
			estimatedArrival: formatISO(arrivalDate),
			actualDeparture:
				status === "completed" || status === "active"
					? formatISO(addDays(departureDate, Math.random() > 0.7 ? 1 : 0))
					: null,
			actualArrival:
				status === "completed"
					? formatISO(addDays(arrivalDate, Math.random() > 0.8 ? 1 : 0))
					: null,
		},

		parties: [
			{
				role: "shipper",
				name: companies.shippers[
					Math.floor(Math.random() * companies.shippers.length)
				],
				contactEmail: "logistics@example.com",
				contactPhone: "+31 20 123 4567",
			},
			{
				role: "consignee",
				name: companies.consignees[
					Math.floor(Math.random() * companies.consignees.length)
				],
				contactEmail: "receiving@example.com",
				contactPhone: "+49 211 987 6543",
			},
			{
				role: "terminal",
				name: origin.terminal,
				contactEmail: "operations@terminal.com",
				contactPhone: "+31 10 234 5678",
			},
			{
				role: "forwarder",
				name: companies.forwarders[
					Math.floor(Math.random() * companies.forwarders.length)
				],
				contactEmail: "bookings@forwarder.com",
				contactPhone: "+31 85 123 4567",
			},
		],

		cargo: {
			description: [
				"Electronics",
				"Machinery Parts",
				"Consumer Goods",
				"Industrial Equipment",
				"Automotive Parts",
			][Math.floor(Math.random() * 5)],
			weight: Math.floor(15000 + Math.random() * 15000),
			weightUnit: "kg",
			value: Math.floor(50000 + Math.random() * 200000),
			currency: "EUR",
			hsCode: ["8517.62", "8471.30", "8536.69", "8481.80", "8708.99"][
				Math.floor(Math.random() * 5)
			],
		},

		documents: [
			{ type: "BOL", id: generateBolId(), status: "verified" },
			{
				type: "commercial_invoice",
				id: `INV-${Math.floor(10000 + Math.random() * 90000)}`,
				status: "pending",
			},
			{
				type: "packing_list",
				id: `PKL-${Math.floor(10000 + Math.random() * 90000)}`,
				status: "verified",
			},
		],

		customsStatus:
			status === "completed"
				? "cleared"
				: status === "active"
					? "in_progress"
					: "pending",

		metadata: {
			createdBy: "user@example.com",
			source: isChild ? "child_orchestration" : "api",
			version: "1.0",
			tags: [isChild ? "child" : "root", status, origin.city.toLowerCase()],
		},

		createdAt: formatISO(createdAt),
		updatedAt: formatISO(subDays(now, Math.floor(Math.random() * daysAgo))),
	};

	if (isChild && parentId) {
		orchestration.parentOrchestrationId = parentId;
		orchestration.metadata.tags.push("child");
	}

	if (!isChild) {
		orchestration.childOrchestrationIds = [];
		orchestration.metadata.tags.push("root");
	}

	return orchestration;
};

// Generate orchestrations
const orchestrations = [];
let idCounter = 1000;

// Generate root orchestrations for ITG
for (let i = 0; i < 15; i++) {
	const id = `orch-itg-${String(idCounter++).padStart(6, "0")}`;
	const rootOrch = generateOrchestration(id, "itg-001", false);
	orchestrations.push(rootOrch);

	// 40% chance of having child orchestrations
	if (Math.random() < 0.4) {
		const numChildren = Math.floor(Math.random() * 3) + 1;
		for (let j = 0; j < numChildren; j++) {
			const childId = `orch-itg-${String(idCounter++).padStart(6, "0")}`;
			const childOrch = generateOrchestration(childId, "itg-001", true, id);
			orchestrations.push(childOrch);
			rootOrch.childOrchestrationIds.push(childId);
		}
	}
}

// Generate root orchestrations for Rotterdam Terminal
for (let i = 0; i < 12; i++) {
	const id = `orch-rct-${String(idCounter++).padStart(6, "0")}`;
	const rootOrch = generateOrchestration(id, "rotterdam-terminal-001", false);
	orchestrations.push(rootOrch);

	// 30% chance of having child orchestrations
	if (Math.random() < 0.3) {
		const numChildren = Math.floor(Math.random() * 2) + 1;
		for (let j = 0; j < numChildren; j++) {
			const childId = `orch-rct-${String(idCounter++).padStart(6, "0")}`;
			const childOrch = generateOrchestration(
				childId,
				"rotterdam-terminal-001",
				true,
				id,
			);
			orchestrations.push(childOrch);
			rootOrch.childOrchestrationIds.push(childId);
		}
	}
}

module.exports = orchestrations;
