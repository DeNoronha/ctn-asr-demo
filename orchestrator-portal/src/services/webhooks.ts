import axios from "axios";
import type { Webhook } from "../types/webhook";

const API_BASE_URL = "http://localhost:3001/api/v1";

export const webhooksApi = {
	getAll: async (tenantId: string) => {
		const response = await axios.get<Webhook[]>(`${API_BASE_URL}/webhooks`, {
			params: { tenantId },
		});
		return response.data;
	},
};
