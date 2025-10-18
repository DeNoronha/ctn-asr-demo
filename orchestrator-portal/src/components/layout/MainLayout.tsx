import { Route, Routes } from "react-router-dom";
import AnalyticsPage from "../../pages/AnalyticsPage";
import DashboardPage from "../../pages/DashboardPage";
import EventsPage from "../../pages/EventsPage";
import OrchestrationDetailPage from "../../pages/OrchestrationDetailPage";
import OrchestrationsPage from "../../pages/OrchestrationsPage";
import WebhooksPage from "../../pages/WebhooksPage";
import AppDrawer from "./AppDrawer";
import Header from "./Header";

export default function MainLayout() {
	return (
		<div className="flex h-screen">
			<AppDrawer />
			<div className="flex-1 flex flex-col">
				<Header />
				<main className="flex-1 overflow-auto p-6 bg-gray-50">
					<Routes>
						<Route path="/" element={<DashboardPage />} />
						<Route path="/dashboard" element={<DashboardPage />} />
						<Route path="/orchestrations" element={<OrchestrationsPage />} />
						<Route
							path="/orchestrations/:id"
							element={<OrchestrationDetailPage />}
						/>
						<Route path="/events" element={<EventsPage />} />
						<Route path="/webhooks" element={<WebhooksPage />} />
						<Route path="/analytics" element={<AnalyticsPage />} />
						<Route
							path="/settings"
							element={
								<div className="text-center py-8">Settings (Coming Soon)</div>
							}
						/>
					</Routes>
				</main>
			</div>
		</div>
	);
}
