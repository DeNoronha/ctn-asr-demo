// Events data generator for mock API

const { subDays, subHours, formatISO } = require("date-fns");

// Event type definitions
const eventTypes = [
	"orchestration.created",
	"orchestration.updated",
	"orchestration.status.updated",
	"orchestration.delay.reported",
	"orchestration.cancelled",
	"orchestration.completed",
	"orchestration.child.created",
	"container.location.updated",
	"container.departed",
	"container.arrived",
	"container.loaded",
	"container.unloaded",
	"document.uploaded",
	"document.verified",
	"customs.cleared",
	"customs.inspection.required",
	"party.notified",
	"webhook.delivered",
	"webhook.failed",
];

// Generate realistic event data
const generateEventData = (type, orchestration) => {
	const baseData = {
		orchestrationId: orchestration.id,
		containerId: orchestration.containerId,
		tenantId: orchestration.tenantId,
	};

	switch (type) {
		case "orchestration.created":
			return {
				...baseData,
				createdBy: orchestration.metadata.createdBy,
				status: orchestration.status,
				route: orchestration.route,
			};

		case "orchestration.status.updated":
			return {
				...baseData,
				previousStatus: ["draft", "active", "delayed"][
					Math.floor(Math.random() * 3)
				],
				newStatus: orchestration.status,
				reason: "Status updated by system",
			};

		case "orchestration.delay.reported":
			return {
				...baseData,
				delayMinutes: Math.floor(30 + Math.random() * 240),
				reason: [
					"Weather conditions",
					"Terminal congestion",
					"Customs inspection",
					"Equipment issue",
				][Math.floor(Math.random() * 4)],
				reportedBy: "terminal-system",
				location: orchestration.route.origin.location,
			};

		case "container.location.updated":
			const locations = [
				orchestration.route.origin.location,
				"In Transit",
				orchestration.route.destination.location,
			];
			return {
				...baseData,
				location: locations[Math.floor(Math.random() * locations.length)],
				coordinates: {
					latitude: 51.9 + Math.random() * 2,
					longitude: 4.5 + Math.random() * 2,
				},
				timestamp: formatISO(
					subHours(new Date(), Math.floor(Math.random() * 12)),
				),
			};

		case "container.departed":
			return {
				...baseData,
				location: orchestration.route.origin.location,
				terminal: orchestration.route.origin.terminal,
				departureTime: orchestration.timeWindow.actualDeparture,
				vehicle: {
					type: "train",
					id: `TRN-${Math.floor(1000 + Math.random() * 9000)}`,
					operator: "EuroRail Services",
				},
			};

		case "container.arrived":
			return {
				...baseData,
				location: orchestration.route.destination.location,
				terminal: orchestration.route.destination.terminal,
				arrivalTime:
					orchestration.timeWindow.actualArrival || formatISO(new Date()),
				condition: "good",
			};

		case "document.verified":
			return {
				...baseData,
				documentType: orchestration.documents[0]?.type || "BOL",
				documentId: orchestration.documents[0]?.id || "DOC-12345",
				verifiedBy: "system",
				verificationMethod: "automated",
			};

		case "customs.cleared":
			return {
				...baseData,
				location: orchestration.route.destination.location,
				customsOffice: "Central Customs Office",
				clearanceNumber: `CLR-${Math.floor(100000 + Math.random() * 900000)}`,
				clearedAt: formatISO(
					subHours(new Date(), Math.floor(Math.random() * 48)),
				),
			};

		case "orchestration.child.created":
			return {
				...baseData,
				parentOrchestrationId:
					orchestration.parentOrchestrationId || orchestration.id,
				childOrchestrationId: `orch-child-${Math.floor(1000 + Math.random() * 9000)}`,
				createdBy: orchestration.metadata.createdBy,
			};

		case "webhook.delivered":
			return {
				...baseData,
				webhookId: `webhook-${Math.floor(100 + Math.random() * 900)}`,
				eventType: "orchestration.status.updated",
				url: "https://example.com/webhooks/orchestration",
				statusCode: 200,
				responseTime: Math.floor(50 + Math.random() * 200),
			};

		default:
			return baseData;
	}
};

// Generate events based on orchestrations
const generateEvents = (orchestrations) => {
	const events = [];
	let eventId = 5000;

	orchestrations.forEach((orchestration) => {
		const now = new Date();
		const orchestrationCreatedAt = new Date(orchestration.createdAt);

		// Always create "orchestration.created" event
		events.push({
			id: `evt-${String(eventId++).padStart(8, "0")}`,
			type: "orchestration.created",
			timestamp: formatISO(orchestrationCreatedAt),
			data: generateEventData("orchestration.created", orchestration),
			source: "orchestrator-api",
			version: "1.0",
		});

		// Generate 2-8 additional events per orchestration
		const numEvents = Math.floor(2 + Math.random() * 7);

		for (let i = 0; i < numEvents; i++) {
			// Select event type based on orchestration status
			let possibleTypes = [...eventTypes];

			if (orchestration.status === "completed") {
				possibleTypes = [
					"container.location.updated",
					"container.departed",
					"container.arrived",
					"document.verified",
					"customs.cleared",
					"orchestration.completed",
				];
			} else if (orchestration.status === "delayed") {
				possibleTypes = [
					"orchestration.delay.reported",
					"container.location.updated",
					"orchestration.status.updated",
				];
			} else if (orchestration.status === "cancelled") {
				possibleTypes = [
					"orchestration.cancelled",
					"orchestration.status.updated",
					"party.notified",
				];
			} else if (orchestration.status === "active") {
				possibleTypes = [
					"container.location.updated",
					"container.departed",
					"container.loaded",
					"document.verified",
					"orchestration.status.updated",
					"webhook.delivered",
				];
			}

			const eventType =
				possibleTypes[Math.floor(Math.random() * possibleTypes.length)];

			// Generate timestamp between orchestration creation and now (last 7 days)
			const daysSinceCreation = Math.floor(
				(now - orchestrationCreatedAt) / (1000 * 60 * 60 * 24),
			);
			const randomDays = Math.min(daysSinceCreation, 7);
			const eventTime = subDays(now, Math.floor(Math.random() * randomDays));
			const eventTimeWithHours = subHours(
				eventTime,
				Math.floor(Math.random() * 24),
			);

			events.push({
				id: `evt-${String(eventId++).padStart(8, "0")}`,
				type: eventType,
				timestamp: formatISO(eventTimeWithHours),
				data: generateEventData(eventType, orchestration),
				source: "orchestrator-api",
				version: "1.0",
			});
		}

		// Add child creation events if applicable
		if (
			orchestration.childOrchestrationIds &&
			orchestration.childOrchestrationIds.length > 0
		) {
			orchestration.childOrchestrationIds.forEach((childId, index) => {
				const childCreationTime = subDays(
					orchestrationCreatedAt,
					-1 * (index + 1),
				);
				events.push({
					id: `evt-${String(eventId++).padStart(8, "0")}`,
					type: "orchestration.child.created",
					timestamp: formatISO(childCreationTime),
					data: {
						...generateEventData("orchestration.child.created", orchestration),
						childOrchestrationId: childId,
					},
					source: "orchestrator-api",
					version: "1.0",
				});
			});
		}
	});

	// Sort events by timestamp (newest first)
	events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

	return events;
};

module.exports = generateEvents;
