/**
 * Health Check Service
 *
 * Monitors API availability and provides fallback behavior when API is unreachable.
 * Used to improve user experience by detecting and handling API outages gracefully.
 *
 * Usage:
 *   import { healthCheckService } from './services/healthCheck';
 *
 *   // Check if API is available before making request
 *   const isHealthy = await healthCheckService.check();
 *
 *   // Get health status (cached for 30 seconds)
 *   const status = healthCheckService.getStatus();
 *
 *   // Subscribe to health changes
 *   healthCheckService.subscribe((healthy) => {
 *     if (!healthy) {
 *       showErrorNotification('API is currently unavailable');
 *     }
 *   });
 */

import axios from "axios";
import { API_BASE_URL } from "../config/api";

interface HealthStatus {
	healthy: boolean;
	lastChecked: Date;
	error?: string;
	responseTime?: number;
}

type HealthChangeListener = (healthy: boolean) => void;

class HealthCheckService {
	private status: HealthStatus = {
		healthy: true,
		lastChecked: new Date(),
	};

	private listeners: HealthChangeListener[] = [];
	private checkInterval: NodeJS.Timeout | null = null;
	private cacheTimeout = 30000; // 30 seconds
	private checkTimeout = 5000; // 5 seconds for health check request

	/**
	 * Start periodic health checks
	 * @param interval Interval in milliseconds (default: 60000 = 1 minute)
	 */
	startMonitoring(interval = 60000): void {
		if (this.checkInterval) {
			return; // Already monitoring
		}

		// Initial check
		this.check();

		// Set up periodic checks
		this.checkInterval = setInterval(() => {
			this.check();
		}, interval);
	}

	/**
	 * Stop periodic health checks
	 */
	stopMonitoring(): void {
		if (this.checkInterval) {
			clearInterval(this.checkInterval);
			this.checkInterval = null;
		}
	}

	/**
	 * Check API health
	 * @returns Promise<boolean> - true if healthy, false otherwise
	 */
	async check(): Promise<boolean> {
		const now = new Date();
		const timeSinceLastCheck = now.getTime() - this.status.lastChecked.getTime();

		// Return cached result if within cache timeout
		if (timeSinceLastCheck < this.cacheTimeout) {
			return this.status.healthy;
		}

		const startTime = Date.now();

		try {
			// Try to ping a lightweight endpoint
			// Using /version or /health if available, otherwise /orchestrations
			const response = await axios.get(`${API_BASE_URL}/version`, {
				timeout: this.checkTimeout,
				headers: {
					"X-Health-Check": "true",
				},
			});

			const responseTime = Date.now() - startTime;
			const wasHealthy = this.status.healthy;

			this.status = {
				healthy: response.status === 200,
				lastChecked: now,
				responseTime,
			};

			// Notify listeners if health status changed
			if (!wasHealthy && this.status.healthy) {
				this.notifyListeners(true);
			}

			return this.status.healthy;
		} catch (error: unknown) {
			const responseTime = Date.now() - startTime;
			const wasHealthy = this.status.healthy;
			const errorMessage = error instanceof Error ? error.message : "Unknown error";

			this.status = {
				healthy: false,
				lastChecked: now,
				error: errorMessage,
				responseTime,
			};

			// Notify listeners if health status changed
			if (wasHealthy) {
				this.notifyListeners(false);
			}

			console.warn("[HealthCheck] API health check failed:", errorMessage);
			return false;
		}
	}

	/**
	 * Get current health status (cached)
	 * @returns HealthStatus
	 */
	getStatus(): HealthStatus {
		return { ...this.status };
	}

	/**
	 * Check if API is healthy (cached)
	 * @returns boolean
	 */
	isHealthy(): boolean {
		return this.status.healthy;
	}

	/**
	 * Subscribe to health status changes
	 * @param listener Callback function called when health status changes
	 * @returns Unsubscribe function
	 */
	subscribe(listener: HealthChangeListener): () => void {
		this.listeners.push(listener);

		// Return unsubscribe function
		return () => {
			const index = this.listeners.indexOf(listener);
			if (index > -1) {
				this.listeners.splice(index, 1);
			}
		};
	}

	/**
	 * Notify all listeners of health status change
	 * @param healthy Current health status
	 */
	private notifyListeners(healthy: boolean): void {
		this.listeners.forEach((listener) => {
			try {
				listener(healthy);
			} catch (error) {
				console.error("[HealthCheck] Error in listener:", error);
			}
		});
	}

	/**
	 * Reset health status (useful for testing)
	 */
	reset(): void {
		this.status = {
			healthy: true,
			lastChecked: new Date(),
		};
	}
}

// Export singleton instance
export const healthCheckService = new HealthCheckService();

// Export type for external use
export type { HealthStatus };
