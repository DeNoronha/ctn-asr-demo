import { Button } from "@progress/kendo-react-buttons";
import { LogOut, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";

export default function Header() {
	const user = useAuthStore((state) => state.user);
	const logout = useAuthStore((state) => state.logout);
	const navigate = useNavigate();

	const handleLogout = () => {
		logout();
		navigate("/login");
	};

	return (
		<header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
			<div className="flex items-center gap-4">
				<h1 className="text-xl font-bold">CTN Orchestrator Portal</h1>
			</div>
			<div className="flex items-center gap-4">
				<div className="flex items-center gap-2">
					<User size={16} />
					<span className="text-sm">{user?.name}</span>
				</div>
				<Button fillMode="flat" onClick={handleLogout}>
					<LogOut size={16} className="mr-2" />
					Logout
				</Button>
			</div>
		</header>
	);
}
