import axios from "axios";
import type { Webhook } from "../types/webhook";
import { API_BASE_URL } from "../config/api";

export const webhooksApi = {
	getAll: async (tenantId: string) => {
		const response = await axios.get<Webhook[]>(`${API_BASE_URL}/webhooks`, {
			params: { tenantId },
		});
		return response.data;
	},
};
