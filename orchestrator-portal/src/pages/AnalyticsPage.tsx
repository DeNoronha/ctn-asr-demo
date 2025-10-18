import {
	Chart,
	ChartCategoryAxis,
	ChartCategoryAxisItem,
	ChartSeries,
	ChartSeriesItem,
} from "@progress/kendo-react-charts";
import { useOrchestrations } from "../hooks/useOrchestrations";
import { useAuthStore } from "../stores/authStore";

export default function AnalyticsPage() {
	const user = useAuthStore((state) => state.user);
	const { data } = useOrchestrations({ tenantId: user?.tenantId, limit: 100 });

	const priorityData = [
		{
			priority: "Urgent",
			count: data?.data.filter((o) => o.priority === "urgent").length || 0,
		},
		{
			priority: "High",
			count: data?.data.filter((o) => o.priority === "high").length || 0,
		},
		{
			priority: "Medium",
			count: data?.data.filter((o) => o.priority === "medium").length || 0,
		},
		{
			priority: "Low",
			count: data?.data.filter((o) => o.priority === "low").length || 0,
		},
	];

	return (
		<div className="space-y-6">
			<h1 className="text-2xl font-bold">Analytics</h1>

			<div className="grid grid-cols-2 gap-6">
				<div className="bg-white p-6 rounded-lg shadow">
					<h2 className="text-lg font-bold mb-4">Orchestrations by Priority</h2>
					<Chart>
						<ChartCategoryAxis>
							<ChartCategoryAxisItem
								categories={priorityData.map((d) => d.priority)}
							/>
						</ChartCategoryAxis>
						<ChartSeries>
							<ChartSeriesItem
								type="column"
								data={priorityData.map((d) => d.count)}
								color="#4a90e2"
							/>
						</ChartSeries>
					</Chart>
				</div>

				<div className="bg-white p-6 rounded-lg shadow">
					<h2 className="text-lg font-bold mb-4">Performance Metrics</h2>
					<div className="space-y-4">
						<div>
							<div className="text-sm text-gray-600">Average Duration</div>
							<div className="text-3xl font-bold">3.2 days</div>
						</div>
						<div>
							<div className="text-sm text-gray-600">On-Time Delivery Rate</div>
							<div className="text-3xl font-bold text-green-600">94%</div>
						</div>
						<div>
							<div className="text-sm text-gray-600">Total Volume (30d)</div>
							<div className="text-3xl font-bold">{data?.total || 0}</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
