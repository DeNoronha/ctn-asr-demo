import { Button, TextInput, PasswordInput } from "@mantine/core";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../stores/authStore";

export default function LoginPage() {
	const [email, setEmail] = useState("itg@example.com");
	const [password, setPassword] = useState("password");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);
	const login = useAuthStore((state) => state.login);
	const navigate = useNavigate();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		setLoading(true);

		try {
			await login(email, password);
			navigate("/dashboard");
		} catch (err) {
			setError("Invalid credentials. Try: itg@example.com / password");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
			<div className="bg-white p-8 rounded-lg shadow-2xl w-96">
				<h1 className="text-3xl font-bold mb-6 text-center">
					CTN Orchestrator Portal
				</h1>
				<form onSubmit={handleSubmit} className="space-y-4">
					<TextInput
						label="Email"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						placeholder="Email"
					/>
					<PasswordInput
						label="Password"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						placeholder="Password"
					/>
					{error && <div className="text-red-600 text-sm">{error}</div>}
					<Button
						type="submit"
						fullWidth
						size="lg"
						disabled={loading}
					>
						{loading ? "Signing in..." : "Sign In"}
					</Button>
					<div className="text-xs text-gray-600 text-center mt-4">
						Demo: itg@example.com / password
					</div>
				</form>
			</div>
		</div>
	);
}
