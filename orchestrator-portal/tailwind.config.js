/** @type {import('tailwindcss').Config} */
export default {
	content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
	theme: {
		extend: {
			colors: {
				"kendo-primary": "#4a90e2",
				"kendo-secondary": "#7ed321",
			},
		},
	},
	plugins: [],
};
