import { useQuery } from "@tanstack/react-query";
import { eventsApi } from "../services/events";

export function useEvents(params?: {
	tenantId?: string;
	orchestrationId?: string;
	type?: string;
	page?: number;
	limit?: number;
}) {
	return useQuery({
		queryKey: ["events", params],
		queryFn: () => eventsApi.getAll(params),
		refetchInterval: 5000, // Poll every 5 seconds for real-time effect
	});
}
