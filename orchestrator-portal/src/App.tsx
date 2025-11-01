import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import MainLayout from "./components/layout/MainLayout";
import LoginPage from "./pages/LoginPage";
import { useAuthStore } from "./stores/authStore";

// Mantine imports
import { MantineProvider, createTheme } from '@mantine/core';
import '@mantine/core/styles.css';

// Mantine theme configuration
const theme = createTheme({
	primaryColor: 'blue',
	defaultRadius: 'md',
	fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
	const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
	return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function App() {
	return (
		<MantineProvider theme={theme}>
			<BrowserRouter>
				<Routes>
					<Route path="/login" element={<LoginPage />} />
					<Route
						path="/*"
						element={
							<ProtectedRoute>
								<MainLayout />
							</ProtectedRoute>
						}
					/>
				</Routes>
			</BrowserRouter>
		</MantineProvider>
	);
}

export default App;
