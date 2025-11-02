import { Button } from "@mantine/core";
import { DataTable, useDataTableColumns } from "mantine-datatable";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useOrchestrations } from "../hooks/useOrchestrations";
import { useAuthStore } from "../stores/authStore";

export default function OrchestrationsPage() {
	const navigate = useNavigate();
	const user = useAuthStore((state) => state.user);
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(20);
	const [search, setSearch] = useState("");
	const [statusFilter, setStatusFilter] = useState<string>("");

	const { data, isLoading } = useOrchestrations({
		tenantId: user?.tenantId,
		status: statusFilter,
		search: search,
		page,
		limit: pageSize,
	});

	const { effectiveColumns } = useDataTableColumns({
		key: "orchestrations-grid",
		columns: [
			{
				accessor: "containerId",
				title: "Container ID",
				width: 150,
				sortable: true,
			},
			{
				accessor: "bolId",
				title: "BOL ID",
				width: 150,
				sortable: true,
			},
			{
				accessor: "status",
				title: "Status",
				width: 120,
				sortable: true,
				render: (record) => {
					const colors = {
						active: "bg-green-100 text-green-800",
						completed: "bg-blue-100 text-blue-800",
						cancelled: "bg-red-100 text-red-800",
						draft: "bg-gray-100 text-gray-800",
						delayed: "bg-yellow-100 text-yellow-800",
					};
					return (
						<span
							className={`px-2 py-1 rounded text-xs font-medium ${colors[record.status as keyof typeof colors]}`}
						>
							{record.status.toUpperCase()}
						</span>
					);
				},
			},
			{
				accessor: "routeSegment",
				title: "Route",
				width: 250,
				render: (record) => (
					<span>
						{record.routeSegment.origin} → {record.routeSegment.destination}
					</span>
				),
			},
			{
				accessor: "priority",
				title: "Priority",
				width: 100,
				sortable: true,
			},
			{
				accessor: "createdAt",
				title: "Created",
				width: 150,
				sortable: true,
				render: (record) => new Date(record.createdAt).toLocaleDateString(),
			},
		],
	});

	return (
		<div className="space-y-4">
			<div className="flex justify-between items-center">
				<h1 className="text-2xl font-bold">Orchestrations</h1>
				<Button leftSection={<Plus size={16} />}>
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

				<DataTable
					records={data?.data || []}
					columns={effectiveColumns}
					fetching={isLoading}
					totalRecords={data?.total || 0}
					recordsPerPage={pageSize}
					page={page}
					onPageChange={setPage}
					recordsPerPageOptions={[10, 20, 50]}
					onRecordsPerPageChange={setPageSize}
					paginationActiveBackgroundColor="blue"
					storeColumnsKey="orchestrations-grid"
					withTableBorder
					striped
					highlightOnHover
					onRowClick={({ record }) => navigate(`/orchestrations/${record.id}`)}
					styles={{
						table: {
							cursor: "pointer",
						},
					}}
				/>
			</div>
		</div>
	);
}
