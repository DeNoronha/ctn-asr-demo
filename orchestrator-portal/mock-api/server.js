// Custom json-server with middleware for realistic API behavior

const jsonServer = require("json-server");
const path = require("path");

const server = jsonServer.create();
const router = jsonServer.router(path.join(__dirname, "db.json"));
const middlewares = jsonServer.defaults();

// Custom middleware
server.use(middlewares);
server.use(jsonServer.bodyParser);

// Add custom headers
server.use((req, res, next) => {
	res.header("X-API-Version", "1.0.0");
	res.header("X-Response-Time", `${Math.floor(Math.random() * 100) + 20}ms`);
	next();
});

// Log requests
server.use((req, res, next) => {
	const timestamp = new Date().toISOString();
	console.log(`[${timestamp}] ${req.method} ${req.url}`);
	next();
});

// Custom routes and filtering
server.get("/api/v1/orchestrations", (req, res) => {
	const db = router.db;
	let orchestrations = db.get("orchestrations").value();

	// Filter by tenantId
	if (req.query.tenantId) {
		orchestrations = orchestrations.filter(
			(o) => o.tenantId === req.query.tenantId,
		);
	}

	// Filter by status
	if (req.query.status) {
		orchestrations = orchestrations.filter(
			(o) => o.status === req.query.status,
		);
	}

	// Filter by parent/child
	if (req.query.type === "root") {
		orchestrations = orchestrations.filter((o) => !o.parentOrchestrationId);
	} else if (req.query.type === "child") {
		orchestrations = orchestrations.filter((o) => o.parentOrchestrationId);
	}

	// Search by containerId or bolId
	if (req.query.search) {
		const searchLower = req.query.search.toLowerCase();
		orchestrations = orchestrations.filter(
			(o) =>
				o.containerId.toLowerCase().includes(searchLower) ||
				o.bolId.toLowerCase().includes(searchLower),
		);
	}

	// Pagination
	const page = Number.parseInt(req.query._page) || 1;
	const limit = Number.parseInt(req.query._limit) || 20;
	const start = (page - 1) * limit;
	const end = start + limit;

	const paginatedData = orchestrations.slice(start, end);

	res.setHeader("X-Total-Count", orchestrations.length);
	res.setHeader("X-Page", page);
	res.setHeader("X-Per-Page", limit);
	res.json(paginatedData);
});

// Get single orchestration with related data
server.get("/api/v1/orchestrations/:id", (req, res) => {
	const db = router.db;
	const orchestration = db
		.get("orchestrations")
		.find({ id: req.params.id })
		.value();

	if (!orchestration) {
		return res.status(404).json({ error: "Orchestration not found" });
	}

	// Add related events
	const events = db
		.get("events")
		.filter((e) => e.data.orchestrationId === req.params.id)
		.orderBy("timestamp", "desc")
		.take(10)
		.value();

	res.json({
		...orchestration,
		recentEvents: events,
	});
});

// Get events with filtering
server.get("/api/v1/events", (req, res) => {
	const db = router.db;
	let events = db.get("events").value();

	// Filter by orchestrationId
	if (req.query.orchestrationId) {
		events = events.filter(
			(e) => e.data.orchestrationId === req.query.orchestrationId,
		);
	}

	// Filter by type
	if (req.query.type) {
		events = events.filter((e) => e.type === req.query.type);
	}

	// Filter by tenantId
	if (req.query.tenantId) {
		events = events.filter((e) => e.data.tenantId === req.query.tenantId);
	}

	// Date range filtering
	if (req.query.startDate) {
		events = events.filter(
			(e) => new Date(e.timestamp) >= new Date(req.query.startDate),
		);
	}
	if (req.query.endDate) {
		events = events.filter(
			(e) => new Date(e.timestamp) <= new Date(req.query.endDate),
		);
	}

	// Sort by timestamp (newest first)
	events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

	// Pagination
	const page = Number.parseInt(req.query._page) || 1;
	const limit = Number.parseInt(req.query._limit) || 50;
	const start = (page - 1) * limit;
	const end = start + limit;

	const paginatedData = events.slice(start, end);

	res.setHeader("X-Total-Count", events.length);
	res.setHeader("X-Page", page);
	res.setHeader("X-Per-Page", limit);
	res.json(paginatedData);
});

// Get webhooks
server.get("/api/v1/webhooks", (req, res) => {
	const db = router.db;
	let webhooks = db.get("webhooks").value();

	// Filter by tenantId
	if (req.query.tenantId) {
		webhooks = webhooks.filter((w) => w.tenantId === req.query.tenantId);
	}

	// Filter by status
	if (req.query.status) {
		webhooks = webhooks.filter((w) => w.status === req.query.status);
	}

	res.json(webhooks);
});

// Create orchestration
server.post("/api/v1/orchestrations", (req, res) => {
	const db = router.db;
	const newOrchestration = {
		id: `orch-${Date.now()}`,
		...req.body,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
	};

	db.get("orchestrations").push(newOrchestration).write();

	// Create orchestration.created event
	const event = {
		id: `evt-${Date.now()}`,
		type: "orchestration.created",
		timestamp: new Date().toISOString(),
		data: {
			orchestrationId: newOrchestration.id,
			containerId: newOrchestration.containerId,
			tenantId: newOrchestration.tenantId,
			createdBy: req.body.metadata?.createdBy || "api",
			status: newOrchestration.status,
		},
		source: "orchestrator-api",
		version: "1.0",
	};

	db.get("events").push(event).write();

	res.status(201).json(newOrchestration);
});

// Update orchestration
server.patch("/api/v1/orchestrations/:id", (req, res) => {
	const db = router.db;
	const orchestration = db.get("orchestrations").find({ id: req.params.id });

	if (!orchestration.value()) {
		return res.status(404).json({ error: "Orchestration not found" });
	}

	const updated = orchestration
		.assign({
			...req.body,
			updatedAt: new Date().toISOString(),
		})
		.write();

	// Create update event
	const event = {
		id: `evt-${Date.now()}`,
		type: "orchestration.updated",
		timestamp: new Date().toISOString(),
		data: {
			orchestrationId: updated.id,
			containerId: updated.containerId,
			tenantId: updated.tenantId,
			changes: req.body,
		},
		source: "orchestrator-api",
		version: "1.0",
	};

	db.get("events").push(event).write();

	res.json(updated);
});

// Health check
server.get("/health", (req, res) => {
	res.json({
		status: "healthy",
		timestamp: new Date().toISOString(),
		version: "1.0.0",
	});
});

// Use default router for other routes
server.use("/api/v1", router);

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
	console.log("");
	console.log("===========================================");
	console.log("  Orchestrator Portal Mock API Server");
	console.log("===========================================");
	console.log("");
	console.log(`  Server running at: http://localhost:${PORT}`);
	console.log("");
	console.log("  Available endpoints:");
	console.log(`    GET    /api/v1/tenants`);
	console.log(`    GET    /api/v1/orchestrations`);
	console.log(`    GET    /api/v1/orchestrations/:id`);
	console.log(`    POST   /api/v1/orchestrations`);
	console.log(`    PATCH  /api/v1/orchestrations/:id`);
	console.log(`    GET    /api/v1/events`);
	console.log(`    GET    /api/v1/webhooks`);
	console.log(`    GET    /health`);
	console.log("");
	console.log("  Query parameters:");
	console.log("    ?tenantId=xxx       - Filter by tenant");
	console.log("    ?status=xxx         - Filter by status");
	console.log("    ?type=root|child    - Filter orchestrations");
	console.log("    ?search=xxx         - Search containers/BOLs");
	console.log("    ?_page=1&_limit=20  - Pagination");
	console.log("");
	console.log("===========================================");
	console.log("");
});
