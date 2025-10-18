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
		// Read individual environment variables from process.env for Azure DevOps CI/CD
		// IMPORTANT: Do NOT use loadEnv() - it only reads .env files, not shell environment variables
		// Azure DevOps sets variables via env: block in YAML, which are shell environment variables
		'process.env.VITE_API_BASE_URL': JSON.stringify(process.env.VITE_API_BASE_URL),
		'process.env.VITE_KENDO_LICENSE_KEY': JSON.stringify(process.env.VITE_KENDO_LICENSE_KEY),
	},
});
