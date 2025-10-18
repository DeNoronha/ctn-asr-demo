import { Plus, Webhook } from "lucide-react";
import { useWebhooks } from "../hooks/useWebhooks";
import { useAuthStore } from "../stores/authStore";

export default function WebhooksPage() {
	const user = useAuthStore((state) => state.user);
	const { data: webhooks, isLoading } = useWebhooks(user?.tenantId || "");

	return (
		<div className="space-y-4">
			<div className="flex justify-between items-center">
				<h1 className="text-2xl font-bold">Webhooks</h1>
				<button
					type="button"
					className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
				>
					<Plus size={16} />
					Add Webhook
				</button>
			</div>

			<div className="grid gap-4">
				{isLoading ? (
					<div className="text-center py-8">Loading webhooks...</div>
				) : (
					webhooks?.map((webhook) => (
						<div key={webhook.id} className="bg-white p-6 rounded-lg shadow">
							<div className="flex items-start justify-between">
								<div className="flex items-start gap-4 flex-1">
									<div className="p-3 bg-purple-100 rounded-lg">
										<Webhook size={24} className="text-purple-600" />
									</div>
									<div className="flex-1">
										<h3 className="font-bold text-lg">{webhook.url}</h3>
										<div className="mt-2 flex flex-wrap gap-2">
											{webhook.eventTypes.map((type) => (
												<span
													key={type}
													className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
												>
													{type}
												</span>
											))}
										</div>
										{webhook.lastDeliveryAt && (
											<div className="mt-2 text-sm text-gray-600">
												Last delivery:{" "}
												{new Date(webhook.lastDeliveryAt).toLocaleString()} •
												Success rate: {webhook.deliverySuccessRate}%
											</div>
										)}
									</div>
								</div>
								<div className="flex items-center gap-2">
									<span
										className={`px-3 py-1 rounded text-sm font-medium ${
											webhook.active
												? "bg-green-100 text-green-800"
												: "bg-gray-100 text-gray-800"
										}`}
									>
										{webhook.active ? "Active" : "Inactive"}
									</span>
									<button
										type="button"
										className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
									>
										Test
									</button>
									<button
										type="button"
										className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
									>
										Edit
									</button>
								</div>
							</div>
						</div>
					))
				)}
			</div>
		</div>
	);
}
