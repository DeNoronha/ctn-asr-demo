/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_KENDO_LICENSE_KEY: string;
	readonly VITE_API_BASE_URL: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
