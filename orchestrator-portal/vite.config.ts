import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import viteTsconfigPaths from "vite-tsconfig-paths";

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [react(), viteTsconfigPaths()],
	server: {
		port: 5173,
		open: true,
	},
	build: {
		outDir: "dist",
		sourcemap: true,
	},
	define: {
		'process.env.VITE_API_BASE_URL': JSON.stringify(process.env.VITE_API_BASE_URL || 'http://localhost:3001/api/v1'),
		'process.env.VITE_KENDO_LICENSE_KEY': JSON.stringify(process.env.VITE_KENDO_LICENSE_KEY || ''),
	},
});
