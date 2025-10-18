import { useQuery } from "@tanstack/react-query";
import { webhooksApi } from "../services/webhooks";

export function useWebhooks(tenantId: string) {
	return useQuery({
		queryKey: ["webhooks", tenantId],
		queryFn: () => webhooksApi.getAll(tenantId),
		enabled: !!tenantId,
	});
}
