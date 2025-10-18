export interface Party {
	partyId: string;
	name: string;
	role: string;
	visibleToParent: boolean;
}

export interface RouteSegment {
	origin: string;
	destination: string;
	originTerminal?: string;
	destinationTerminal?: string;
}

export interface TimeWindow {
	start: string;
	end: string;
}

export interface Orchestration {
	id: string;
	tenantId: string;
	containerId: string;
	bolId: string;
	status: "active" | "completed" | "cancelled" | "draft" | "delayed";
	priority: "low" | "medium" | "high" | "urgent";
	routeSegment: RouteSegment;
	timeWindow: TimeWindow;
	parties: Party[];
	parentOrchestrationId?: string;
	childOrchestrations?: string[];
	cargo?: {
		description: string;
		weight: number;
		value: number;
		hsCode?: string;
	};
	createdAt: string;
	updatedAt: string;
	recentEvents?: Event[];
}

export interface Event {
	id: string;
	orchestrationId: string;
	type: string;
	timestamp: string;
	data: Record<string, any>;
	source?: string;
}
