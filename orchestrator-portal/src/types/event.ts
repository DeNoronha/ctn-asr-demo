export interface Event {
	id: string;
	orchestrationId: string;
	tenantId: string;
	type: string;
	timestamp: string;
	data: Record<string, unknown>;
	source?: string;
}
