import { create } from "zustand";

interface User {
	id: string;
	name: string;
	email: string;
	tenantId: string;
	role: string;
}

interface AuthState {
	user: User | null;
	token: string | null;
	isAuthenticated: boolean;
	login: (email: string, password: string) => Promise<void>;
	logout: () => void;
}

// Mock users database
const mockUsers: Record<string, User> = {
	"itg@example.com": {
		id: "user-1",
		name: "John Doe",
		email: "itg@example.com",
		tenantId: "itg-001",
		role: "admin",
	},
	"rotterdam@example.com": {
		id: "user-2",
		name: "Jane Smith",
		email: "rotterdam@example.com",
		tenantId: "rotterdam-terminal-001",
		role: "orchestrator",
	},
};

export const useAuthStore = create<AuthState>((set) => ({
	user: null,
	token: null,
	isAuthenticated: false,

	login: async (email: string, password: string) => {
		// Mock authentication
		if (mockUsers[email] && password === "password") {
			const user = mockUsers[email];
			const token = btoa(JSON.stringify(user)); // Mock JWT
			localStorage.setItem("auth-token", token);
			localStorage.setItem("auth-user", JSON.stringify(user));
			set({ user, token, isAuthenticated: true });
		} else {
			throw new Error("Invalid credentials");
		}
	},

	logout: () => {
		localStorage.removeItem("auth-token");
		localStorage.removeItem("auth-user");
		set({ user: null, token: null, isAuthenticated: false });
	},
}));
