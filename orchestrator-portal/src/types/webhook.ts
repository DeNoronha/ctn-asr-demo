export interface Webhook {
	id: string;
	tenantId: string;
	url: string;
	secret: string;
	eventTypes: string[];
	active: boolean;
	createdAt: string;
	lastDeliveryAt?: string;
	deliverySuccessRate?: number;
}
