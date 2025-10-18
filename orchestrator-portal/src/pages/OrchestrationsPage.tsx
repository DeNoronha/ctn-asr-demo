import { Button } from "@progress/kendo-react-buttons";
import {
	Grid,
	GridColumn,
	type GridCellProps,
	type GridPageChangeEvent,
	type GridRowClickEvent,
} from "@progress/kendo-react-grid";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useOrchestrations } from "../hooks/useOrchestrations";
import { useAuthStore } from "../stores/authStore";

const StatusCell = (props: GridCellProps) => {
	const status = props.dataItem.status;
	const colors = {
		active: "bg-green-100 text-green-800",
		completed: "bg-blue-100 text-blue-800",
		cancelled: "bg-red-100 text-red-800",
		draft: "bg-gray-100 text-gray-800",
		delayed: "bg-yellow-100 text-yellow-800",
	};

	return (
		<td>
			<span
				className={`px-2 py-1 rounded text-xs font-medium ${colors[status as keyof typeof colors]}`}
			>
				{status.toUpperCase()}
			</span>
		</td>
	);
};

const RouteCell = (props: GridCellProps) => {
	const route = props.dataItem.routeSegment;
	return (
		<td>
			{route.origin} → {route.destination}
		</td>
	);
};

export default function OrchestrationsPage() {
	const navigate = useNavigate();
	const user = useAuthStore((state) => state.user);
	const [page, setPage] = useState(1);
	const [pageSize] = useState(20);
	const [search, setSearch] = useState("");
	const [statusFilter, setStatusFilter] = useState<string>("");

	const { data, isLoading } = useOrchestrations({
		tenantId: user?.tenantId,
		status: statusFilter,
		search: search,
		page,
		limit: pageSize,
	});

	const handlePageChange = (event: GridPageChangeEvent) => {
		setPage(event.page.skip / event.page.take + 1);
	};

	const handleRowClick = (event: GridRowClickEvent) => {
		navigate(`/orchestrations/${event.dataItem.id}`);
	};

	return (
		<div className="space-y-4">
			<div className="flex justify-between items-center">
				<h1 className="text-2xl font-bold">Orchestrations</h1>
				<Button themeColor="primary">
					<Plus size={16} className="mr-2" />
					Create Orchestration
				</Button>
			</div>

			<div className="bg-white p-4 rounded-lg shadow space-y-4">
				<div className="flex gap-4">
					<input
						type="text"
						placeholder="Search by Container ID or BOL..."
						className="flex-1 px-3 py-2 border rounded"
						value={search}
						onChange={(e) => setSearch(e.target.value)}
					/>
					<select
						className="px-3 py-2 border rounded"
						value={statusFilter}
						onChange={(e) => setStatusFilter(e.target.value)}
					>
						<option value="">All Statuses</option>
						<option value="active">Active</option>
						<option value="completed">Completed</option>
						<option value="delayed">Delayed</option>
						<option value="cancelled">Cancelled</option>
						<option value="draft">Draft</option>
					</select>
				</div>

				{isLoading ? (
					<div className="text-center py-8">Loading...</div>
				) : (
					<Grid
						data={data?.data || []}
						total={data?.total || 0}
						skip={(page - 1) * pageSize}
						take={pageSize}
						pageable={{
							buttonCount: 5,
							info: true,
							type: "numeric",
							pageSizes: [10, 20, 50],
							previousNext: true,
						}}
						onPageChange={handlePageChange}
						onRowClick={handleRowClick}
						style={{ cursor: "pointer" }}
					>
						<GridColumn
							field="containerId"
							title="Container ID"
							width="150px"
						/>
						<GridColumn field="bolId" title="BOL ID" width="150px" />
						<GridColumn
							field="status"
							title="Status"
							width="120px"
							cell={StatusCell}
						/>
						<GridColumn
							field="routeSegment"
							title="Route"
							width="250px"
							cell={RouteCell}
						/>
						<GridColumn field="priority" title="Priority" width="100px" />
						<GridColumn
							field="createdAt"
							title="Created"
							width="150px"
							cell={(props) => (
								<td>
									{new Date(props.dataItem.createdAt).toLocaleDateString()}
								</td>
							)}
						/>
					</Grid>
				)}
			</div>
		</div>
	);
}
