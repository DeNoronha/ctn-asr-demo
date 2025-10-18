import { create } from "zustand";

interface Tenant {
	id: string;
	name: string;
	logo?: string;
	primaryColor: string;
}

interface TenantState {
	currentTenant: Tenant | null;
	tenants: Tenant[];
	setTenant: (tenant: Tenant) => void;
	loadTenants: () => void;
}

const mockTenants: Tenant[] = [
	{
		id: "itg-001",
		name: "ITG - Inland Terminal Group",
		primaryColor: "#4a90e2",
	},
	{
		id: "rotterdam-terminal-001",
		name: "Rotterdam Terminal",
		primaryColor: "#7ed321",
	},
];

export const useTenantStore = create<TenantState>((set) => ({
	currentTenant: null,
	tenants: [],

	setTenant: (tenant) => set({ currentTenant: tenant }),

	loadTenants: () => set({ tenants: mockTenants }),
}));
