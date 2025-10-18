import {
	Chart,
	ChartSeries,
	ChartSeriesItem,
} from "@progress/kendo-react-charts";
import { Activity, AlertTriangle, Clock, Package } from "lucide-react";
import { useOrchestrations } from "../hooks/useOrchestrations";
import { useAuthStore } from "../stores/authStore";

export default function DashboardPage() {
	const user = useAuthStore((state) => state.user);
	const { data } = useOrchestrations({ tenantId: user?.tenantId, limit: 100 });

	const stats = {
		active: data?.data.filter((o) => o.status === "active").length || 0,
		completed: data?.data.filter((o) => o.status === "completed").length || 0,
		delayed: data?.data.filter((o) => o.status === "delayed").length || 0,
		total: data?.total || 0,
	};

	const statusData = [
		{ status: "Active", count: stats.active, color: "#10b981" },
		{ status: "Completed", count: stats.completed, color: "#3b82f6" },
		{ status: "Delayed", count: stats.delayed, color: "#f59e0b" },
	];

	return (
		<div className="space-y-6">
			<h1 className="text-2xl font-bold">Dashboard</h1>

			{/* Stats Cards */}
			<div className="grid grid-cols-4 gap-4">
				<div className="bg-white p-6 rounded-lg shadow">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm text-gray-600">Active Orchestrations</p>
							<p className="text-3xl font-bold">{stats.active}</p>
						</div>
						<Package className="text-green-500" size={40} />
					</div>
				</div>
				<div className="bg-white p-6 rounded-lg shadow">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm text-gray-600">Completed This Month</p>
							<p className="text-3xl font-bold">{stats.completed}</p>
						</div>
						<Activity className="text-blue-500" size={40} />
					</div>
				</div>
				<div className="bg-white p-6 rounded-lg shadow">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm text-gray-600">Delayed</p>
							<p className="text-3xl font-bold">{stats.delayed}</p>
						</div>
						<AlertTriangle className="text-yellow-500" size={40} />
					</div>
				</div>
				<div className="bg-white p-6 rounded-lg shadow">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm text-gray-600">Total</p>
							<p className="text-3xl font-bold">{stats.total}</p>
						</div>
						<Clock className="text-purple-500" size={40} />
					</div>
				</div>
			</div>

			{/* Charts */}
			<div className="grid grid-cols-2 gap-6">
				<div className="bg-white p-6 rounded-lg shadow">
					<h2 className="text-lg font-bold mb-4">Status Breakdown</h2>
					<Chart>
						<ChartSeries>
							<ChartSeriesItem
								type="donut"
								data={statusData}
								field="count"
								categoryField="status"
								colorField="color"
							/>
						</ChartSeries>
					</Chart>
				</div>

				<div className="bg-white p-6 rounded-lg shadow">
					<h2 className="text-lg font-bold mb-4">Recent Activity</h2>
					<div className="space-y-3">
						{data?.data.slice(0, 5).map((orch) => (
							<div
								key={orch.id}
								className="flex items-center justify-between border-b pb-2"
							>
								<div>
									<div className="font-medium">{orch.containerId}</div>
									<div className="text-sm text-gray-600">
										{orch.routeSegment.origin} → {orch.routeSegment.destination}
									</div>
								</div>
								<span
									className={`px-2 py-1 rounded text-xs ${
										orch.status === "active"
											? "bg-green-100 text-green-800"
											: orch.status === "completed"
												? "bg-blue-100 text-blue-800"
												: "bg-gray-100 text-gray-800"
									}`}
								>
									{orch.status}
								</span>
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}
