// Tenant data for mock API

const tenants = [
	{
		id: "itg-001",
		name: "ITG Intermodal Transport Group",
		code: "ITG",
		type: "forwarder",
		status: "active",
		contactEmail: "operations@itg-logistics.com",
		contactPhone: "+31 10 234 5678",
		address: {
			street: "Waalhaven Zuidzijde 15",
			city: "Rotterdam",
			postalCode: "3089 JH",
			country: "Netherlands",
		},
		settings: {
			defaultLanguage: "en",
			timezone: "Europe/Amsterdam",
			enableWebhooks: true,
			enableEmailNotifications: true,
		},
		createdAt: "2024-01-15T10:00:00Z",
		updatedAt: "2025-10-10T14:30:00Z",
	},
	{
		id: "rotterdam-terminal-001",
		name: "Rotterdam Container Terminal",
		code: "RCT",
		type: "terminal",
		status: "active",
		contactEmail: "operations@rct-terminal.nl",
		contactPhone: "+31 10 987 6543",
		address: {
			street: "Maasvlakte Rotterdam 1",
			city: "Rotterdam",
			postalCode: "3199 LH",
			country: "Netherlands",
		},
		settings: {
			defaultLanguage: "nl",
			timezone: "Europe/Amsterdam",
			enableWebhooks: true,
			enableEmailNotifications: true,
		},
		createdAt: "2024-02-01T09:00:00Z",
		updatedAt: "2025-10-12T11:20:00Z",
	},
];

module.exports = tenants;
