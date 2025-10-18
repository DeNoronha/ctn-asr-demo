import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orchestrationsApi } from "../services/orchestrations";

export function useOrchestrations(params?: {
	tenantId?: string;
	status?: string;
	search?: string;
	page?: number;
	limit?: number;
}) {
	return useQuery({
		queryKey: ["orchestrations", params],
		queryFn: () => orchestrationsApi.getAll(params),
	});
}

export function useOrchestration(id: string) {
	return useQuery({
		queryKey: ["orchestration", id],
		queryFn: () => orchestrationsApi.getById(id),
		enabled: !!id,
	});
}

export function useCreateOrchestration() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: orchestrationsApi.create,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["orchestrations"] });
		},
	});
}
