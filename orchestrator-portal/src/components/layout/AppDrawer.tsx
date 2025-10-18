import {
	Activity,
	BarChart3,
	LayoutDashboard,
	Package,
	Settings,
	Webhook,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

const menuItems = [
	{ path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
	{ path: "/orchestrations", label: "Orchestrations", icon: Package },
	{ path: "/events", label: "Events", icon: Activity },
	{ path: "/webhooks", label: "Webhooks", icon: Webhook },
	{ path: "/analytics", label: "Analytics", icon: BarChart3 },
	{ path: "/settings", label: "Settings", icon: Settings },
];

export default function AppDrawer() {
	const navigate = useNavigate();
	const location = useLocation();

	return (
		<nav className="w-64 bg-gray-900 text-white p-4">
			<div className="mb-8">
				<h2 className="text-lg font-bold">CTN Portal</h2>
			</div>
			<div className="space-y-2">
				{menuItems.map((item) => {
					const Icon = item.icon;
					const isActive = location.pathname === item.path;
					return (
						<button
							type="button"
							key={item.path}
							onClick={() => navigate(item.path)}
							className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
								isActive ? "bg-blue-600" : "hover:bg-gray-800"
							}`}
						>
							<Icon size={20} />
							<span>{item.label}</span>
						</button>
					);
				})}
			</div>
		</nav>
	);
}
