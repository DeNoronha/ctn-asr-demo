import axios from "axios";
import type { Event } from "../types/event";

const API_BASE_URL = "http://localhost:3001/api/v1";

export const eventsApi = {
	getAll: async (params?: {
		tenantId?: string;
		orchestrationId?: string;
		type?: string;
		page?: number;
		limit?: number;
	}) => {
		const response = await axios.get<Event[]>(`${API_BASE_URL}/events`, {
			params: {
				tenantId: params?.tenantId,
				orchestrationId: params?.orchestrationId,
				type: params?.type,
				_page: params?.page || 1,
				_limit: params?.limit || 50,
				_sort: "timestamp",
				_order: "desc",
			},
		});
		return {
			data: response.data,
			total: Number.parseInt(response.headers["x-total-count"] || "0"),
		};
	},
};
