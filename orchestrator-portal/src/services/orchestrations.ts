import axios from "axios";
import type { Orchestration } from "../types/orchestration";
import { API_BASE_URL } from "../config/api";

export const orchestrationsApi = {
	getAll: async (params?: {
		tenantId?: string;
		status?: string;
		search?: string;
		page?: number;
		limit?: number;
	}) => {
		const response = await axios.get<Orchestration[]>(
			`${API_BASE_URL}/orchestrations`,
			{
				params: {
					tenantId: params?.tenantId,
					status: params?.status,
					search: params?.search,
					_page: params?.page || 1,
					_limit: params?.limit || 20,
				},
			},
		);
		return {
			data: response.data,
			total: Number.parseInt(response.headers["x-total-count"] || "0"),
		};
	},

	getById: async (id: string) => {
		const response = await axios.get<Orchestration>(
			`${API_BASE_URL}/orchestrations/${id}`,
		);
		return response.data;
	},

	create: async (data: Partial<Orchestration>) => {
		const response = await axios.post<Orchestration>(
			`${API_BASE_URL}/orchestrations`,
			data,
		);
		return response.data;
	},

	update: async (id: string, data: Partial<Orchestration>) => {
		const response = await axios.patch<Orchestration>(
			`${API_BASE_URL}/orchestrations/${id}`,
			data,
		);
		return response.data;
	},
};
