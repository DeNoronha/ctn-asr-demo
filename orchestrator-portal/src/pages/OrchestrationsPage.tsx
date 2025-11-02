import { Button, Stack, Group, Title, Paper, TextInput, Select, Badge } from "@mantine/core";
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
					const colors: Record<string, string> = {
						active: "green",
						completed: "blue",
						cancelled: "red",
						draft: "gray",
						delayed: "yellow",
					};
					return (
						<Badge color={colors[record.status] || "gray"} variant="light">
							{record.status.toUpperCase()}
						</Badge>
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
		<Stack gap="md">
			<Group justify="space-between" align="center">
				<Title order={1}>Orchestrations</Title>
				<Button leftSection={<Plus size={16} />}>
					Create Orchestration
				</Button>
			</Group>

			<Paper shadow="sm" p="md" radius="md" withBorder>
				<Stack gap="md">
					<Group gap="md">
						<TextInput
							flex={1}
							placeholder="Search by Container ID or BOL..."
							value={search}
							onChange={(e) => setSearch(e.currentTarget.value)}
						/>
						<Select
							placeholder="All Statuses"
							value={statusFilter}
							onChange={(value) => setStatusFilter(value || "")}
							data={[
								{ value: "", label: "All Statuses" },
								{ value: "active", label: "Active" },
								{ value: "completed", label: "Completed" },
								{ value: "delayed", label: "Delayed" },
								{ value: "cancelled", label: "Cancelled" },
								{ value: "draft", label: "Draft" },
							]}
							clearable
						/>
					</Group>

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
				</Stack>
			</Paper>
		</Stack>
	);
}
