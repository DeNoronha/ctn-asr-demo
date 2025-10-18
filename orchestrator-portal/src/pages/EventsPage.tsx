import { formatDistanceToNow } from "date-fns";
import { Activity } from "lucide-react";
import { useState } from "react";
import { useEvents } from "../hooks/useEvents";
import { useAuthStore } from "../stores/authStore";

export default function EventsPage() {
	const user = useAuthStore((state) => state.user);
	const [typeFilter, setTypeFilter] = useState("");
	const [page, setPage] = useState(1);

	const { data, isLoading } = useEvents({
		tenantId: user?.tenantId,
		type: typeFilter,
		page,
		limit: 50,
	});

	const eventTypeColors: Record<string, string> = {
		"orchestration.created": "bg-blue-100 text-blue-800",
		"orchestration.delay.reported": "bg-yellow-100 text-yellow-800",
		"orchestration.status.updated": "bg-green-100 text-green-800",
		"orchestration.cancelled": "bg-red-100 text-red-800",
		"container.location.updated": "bg-purple-100 text-purple-800",
	};

	return (
		<div className="space-y-4">
			<div className="flex justify-between items-center">
				<h1 className="text-2xl font-bold">Event Feed</h1>
				<div className="flex items-center gap-2">
					<Activity size={16} className="animate-pulse text-green-500" />
					<span className="text-sm text-gray-600">Live</span>
				</div>
			</div>

			<div className="bg-white p-4 rounded-lg shadow">
				<select
					className="px-3 py-2 border rounded"
					value={typeFilter}
					onChange={(e) => setTypeFilter(e.target.value)}
				>
					<option value="">All Event Types</option>
					<option value="orchestration.created">Orchestration Created</option>
					<option value="orchestration.delay.reported">Delay Reported</option>
					<option value="orchestration.status.updated">Status Updated</option>
					<option value="container.location.updated">Location Updated</option>
				</select>
			</div>

			<div className="space-y-3">
				{isLoading ? (
					<div className="text-center py-8">Loading events...</div>
				) : (
					data?.data.map((event) => (
						<div
							key={event.id}
							className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow"
						>
							<div className="flex items-start justify-between">
								<div className="flex items-start gap-4 flex-1">
									<div className="mt-1">
										<Activity size={20} className="text-blue-500" />
									</div>
									<div className="flex-1">
										<div className="flex items-center gap-2 mb-1">
											<span
												className={`px-2 py-1 rounded text-xs font-medium ${
													eventTypeColors[event.type] ||
													"bg-gray-100 text-gray-800"
												}`}
											>
												{event.type}
											</span>
											<span className="text-sm text-gray-600">
												{formatDistanceToNow(new Date(event.timestamp), {
													addSuffix: true,
												})}
											</span>
										</div>
										<div className="text-sm text-gray-600">
											Orchestration:{" "}
											<span className="font-mono">{event.orchestrationId}</span>
										</div>
										{event.data && Object.keys(event.data).length > 0 && (
											<pre className="mt-2 text-xs bg-gray-50 p-2 rounded overflow-x-auto">
												{JSON.stringify(event.data, null, 2)}
											</pre>
										)}
									</div>
								</div>
							</div>
						</div>
					))
				)}
			</div>

			{data && data.total > 50 && (
				<div className="flex justify-center gap-2">
					<button
						type="button"
						onClick={() => setPage((p) => Math.max(1, p - 1))}
						disabled={page === 1}
						className="px-4 py-2 border rounded disabled:opacity-50"
					>
						Previous
					</button>
					<span className="px-4 py-2">Page {page}</span>
					<button
						type="button"
						onClick={() => setPage((p) => p + 1)}
						disabled={page * 50 >= data.total}
						className="px-4 py-2 border rounded disabled:opacity-50"
					>
						Next
					</button>
				</div>
			)}
		</div>
	);
}
