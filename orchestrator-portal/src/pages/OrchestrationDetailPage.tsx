import { Button } from "@mantine/core";
import { ArrowLeft, Package } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useOrchestration } from "../hooks/useOrchestrations";

export default function OrchestrationDetailPage() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const { data: orchestration, isLoading } = useOrchestration(id || "");

	if (isLoading) {
		return <div className="text-center py-8">Loading...</div>;
	}

	if (!orchestration || !id) {
		return <div className="text-center py-8">Orchestration not found</div>;
	}

	const statusColors = {
		active: "bg-green-100 text-green-800",
		completed: "bg-blue-100 text-blue-800",
		cancelled: "bg-red-100 text-red-800",
		draft: "bg-gray-100 text-gray-800",
		delayed: "bg-yellow-100 text-yellow-800",
	};

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-4">
				<Button variant="subtle" onClick={() => navigate("/orchestrations")} leftSection={<ArrowLeft size={16} />}>
					Back
				</Button>
				<h1 className="text-2xl font-bold">Orchestration Details</h1>
			</div>

			{/* Header */}
			<div className="bg-white p-6 rounded-lg shadow">
				<div className="flex items-start justify-between">
					<div className="flex items-center gap-4">
						<div className="p-3 bg-blue-100 rounded-lg">
							<Package size={32} className="text-blue-600" />
						</div>
						<div>
							<h2 className="text-xl font-bold">{orchestration.containerId}</h2>
							<p className="text-gray-600">BOL: {orchestration.bolId}</p>
						</div>
					</div>
					<span
						className={`px-3 py-1 rounded text-sm font-medium ${statusColors[orchestration.status]}`}
					>
						{orchestration.status.toUpperCase()}
					</span>
				</div>
			</div>

			{/* Route & Time */}
			<div className="grid grid-cols-2 gap-6">
				<div className="bg-white p-6 rounded-lg shadow">
					<h3 className="text-lg font-bold mb-4">Route</h3>
					<div className="space-y-2">
						<div>
							<div className="text-sm text-gray-600">Origin</div>
							<div className="font-medium">
								{orchestration.routeSegment.origin}
							</div>
							{orchestration.routeSegment.originTerminal && (
								<div className="text-sm text-gray-500">
									{orchestration.routeSegment.originTerminal}
								</div>
							)}
						</div>
						<div className="text-center text-2xl text-gray-400">→</div>
						<div>
							<div className="text-sm text-gray-600">Destination</div>
							<div className="font-medium">
								{orchestration.routeSegment.destination}
							</div>
							{orchestration.routeSegment.destinationTerminal && (
								<div className="text-sm text-gray-500">
									{orchestration.routeSegment.destinationTerminal}
								</div>
							)}
						</div>
					</div>
				</div>

				<div className="bg-white p-6 rounded-lg shadow">
					<h3 className="text-lg font-bold mb-4">Time Window</h3>
					<div className="space-y-2">
						<div>
							<div className="text-sm text-gray-600">Start</div>
							<div className="font-medium">
								{new Date(orchestration.timeWindow.start).toLocaleString()}
							</div>
						</div>
						<div>
							<div className="text-sm text-gray-600">End</div>
							<div className="font-medium">
								{new Date(orchestration.timeWindow.end).toLocaleString()}
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Parties */}
			<div className="bg-white p-6 rounded-lg shadow">
				<h3 className="text-lg font-bold mb-4">Parties</h3>
				<div className="grid grid-cols-2 gap-4">
					{orchestration.parties.map((party) => (
						<div key={party.partyId} className="border p-3 rounded">
							<div className="text-sm text-gray-600">{party.role}</div>
							<div className="font-medium">{party.name}</div>
						</div>
					))}
				</div>
			</div>

			{/* Cargo */}
			{orchestration.cargo && (
				<div className="bg-white p-6 rounded-lg shadow">
					<h3 className="text-lg font-bold mb-4">Cargo</h3>
					<div className="grid grid-cols-3 gap-4">
						<div>
							<div className="text-sm text-gray-600">Description</div>
							<div className="font-medium">
								{orchestration.cargo.description}
							</div>
						</div>
						<div>
							<div className="text-sm text-gray-600">Weight</div>
							<div className="font-medium">
								{orchestration.cargo.weight.toLocaleString()} kg
							</div>
						</div>
						<div>
							<div className="text-sm text-gray-600">Value</div>
							<div className="font-medium">
								€{orchestration.cargo.value.toLocaleString()}
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Recent Events */}
			{orchestration.recentEvents && orchestration.recentEvents.length > 0 && (
				<div className="bg-white p-6 rounded-lg shadow">
					<h3 className="text-lg font-bold mb-4">Recent Events</h3>
					<div className="space-y-2">
						{orchestration.recentEvents.map((event) => (
							<div
								key={event.id}
								className="border-l-4 border-blue-500 pl-4 py-2"
							>
								<div className="font-medium">{event.type}</div>
								<div className="text-sm text-gray-600">
									{new Date(event.timestamp).toLocaleString()}
								</div>
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
}
