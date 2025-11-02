/**
 * Health Dashboard Component
 * Displays comprehensive system health monitoring with real-time status checks
 */

import { Button, Card, Loader } from '@mantine/core';

import { Activity, AlertTriangle, CheckCircle, RefreshCw, XCircle } from './icons';
import type React from 'react';
import { useEffect, useState } from 'react';
import './HealthDashboard.css';

interface HealthCheck {
  status: 'up' | 'down';
  responseTime?: number;
  error?: string;
  details?: Record<string, any>;
}

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  environment: string;
  version: string;
  checks: {
    database: HealthCheck;
    applicationInsights: HealthCheck;
    azureKeyVault: HealthCheck;
    staticWebApps: HealthCheck;
  };
}

export const HealthDashboard: React.FC = () => {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const API_URL = import.meta.env.VITE_API_URL?.replace('/v1', '') ||
                  'https://func-ctn-demo-asr-dev.azurewebsites.net/api';
  const environmentName = (import.meta.env as any).VITE_ENVIRONMENT_NAME || (import.meta.env.MODE === 'production' ? 'Production' : 'Development');

  const fetchHealth = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/health`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setHealth(data);
      setError(null);
      setLastRefresh(new Date());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch health status';
      setError(errorMessage);
      console.error('Health check failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchHealth, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'up':
        return <CheckCircle className="status-icon success" />;
      case 'degraded':
        return <AlertTriangle className="status-icon warning" />;
      case 'unhealthy':
      case 'down':
        return <XCircle className="status-icon error" />;
      default:
        return <Activity className="status-icon info" />;
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'up':
        return 'success';
      case 'degraded':
        return 'warning';
      case 'unhealthy':
      case 'down':
        return 'error';
      default:
        return 'info';
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  const formatTimeSince = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  if (loading && !health) {
    return (
      <div className="health-dashboard-loading">
        <Loader type="infinite-spinner" size="lg" />
        <p>Loading health status...</p>
      </div>
    );
  }

  if (error && !health) {
    return (
      <div className="health-dashboard-error">
        <XCircle className="error-icon" size={48} />
        <h2>Error Loading Health Status</h2>
        <p>{error}</p>
        <Button onClick={fetchHealth} color="blue">
          <RefreshCw size={16} /> Retry
        </Button>
      </div>
    );
  }

  if (!health) return null;

  return (
    <div className="health-dashboard">
      <div className="health-header">
        <div className="health-title">
          <Activity size={32} />
          <h1>System Health</h1>
        </div>
        <div className="health-actions">
          <div className="auto-refresh-toggle">
            <label>
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
              <span>Auto-refresh (30s)</span>
            </label>
            <span className="last-refresh">Last: {formatTimeSince(lastRefresh)}</span>
          </div>
          <Button
            onClick={fetchHealth}
            disabled={loading}
            color="blue"
            leftSection="refresh"
          >
            {loading ? 'Refreshing...' : 'Refresh Now'}
          </Button>
        </div>
      </div>

      {/* Overall Status Card */}
      <Card className={`overall-status status-${getStatusClass(health.status)}`}>
        <div className="card-header">
          <div className="overall-status-header">
            {getStatusIcon(health.status)}
            <h2>Overall Status: {health.status.toUpperCase()}</h2>
          </div>
        </div>
        <div className="card-body">
          <div className="status-details">
            <div className="status-detail">
              <span className="detail-label">Environment:</span>
              <span className="detail-value">{environmentName}</span>
            </div>
            <div className="status-detail">
              <span className="detail-label">Version:</span>
              <span className="detail-value">{health.version}</span>
            </div>
            <div className="status-detail">
              <span className="detail-label">Uptime:</span>
              <span className="detail-value">{formatUptime(health.uptime)}</span>
            </div>
            <div className="status-detail">
              <span className="detail-label">Last Updated:</span>
              <span className="detail-value">
                {new Date(health.timestamp).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Individual Checks Grid */}
      {health.checks && (
      <div className="health-checks-grid">
        {/* Database Check */}
        {health.checks.database && (
        <Card className={`health-check status-${getStatusClass(health.checks.database.status)}`}>
          <div className="card-header">
            <div className="check-header">
              {getStatusIcon(health.checks.database.status)}
              <h3>Database</h3>
            </div>
          </div>
          <div className="card-body">
            <div className="check-details">
              <div className="check-detail">
                <span className="detail-label">Status:</span>
                <span className="detail-value">{health.checks.database.status}</span>
              </div>
              {health.checks.database.responseTime !== undefined && (
                <div className="check-detail">
                  <span className="detail-label">Response Time:</span>
                  <span className="detail-value">{health.checks.database.responseTime}ms</span>
                </div>
              )}
              {health.checks.database.error && (
                <div className="error-message">
                  <AlertTriangle size={16} />
                  {health.checks.database.error}
                </div>
              )}
            </div>
          </div>
        </Card>
        )}

        {/* Application Insights Check */}
        {health.checks.applicationInsights && (
        <Card className={`health-check status-${getStatusClass(health.checks.applicationInsights.status)}`}>
          <div className="card-header">
            <div className="check-header">
              {getStatusIcon(health.checks.applicationInsights.status)}
              <h3>Application Insights</h3>
            </div>
          </div>
          <div className="card-body">
            <div className="check-details">
              <div className="check-detail">
                <span className="detail-label">Status:</span>
                <span className="detail-value">{health.checks.applicationInsights.status}</span>
              </div>
              {health.checks.applicationInsights.details?.configured && (
                <div className="check-detail">
                  <span className="detail-label">Configured:</span>
                  <span className="detail-value">Yes</span>
                </div>
              )}
              {health.checks.applicationInsights.error && (
                <div className="error-message">
                  <AlertTriangle size={16} />
                  {health.checks.applicationInsights.error}
                </div>
              )}
            </div>
          </div>
        </Card>
        )}

        {/* Azure Key Vault Check */}
        {health.checks.azureKeyVault && (
        <Card className={`health-check status-${getStatusClass(health.checks.azureKeyVault.status)}`}>
          <div className="card-header">
            <div className="check-header">
              {getStatusIcon(health.checks.azureKeyVault.status)}
              <h3>Azure Key Vault</h3>
            </div>
          </div>
          <div className="card-body">
            <div className="check-details">
              <div className="check-detail">
                <span className="detail-label">Status:</span>
                <span className="detail-value">{health.checks.azureKeyVault.status}</span>
              </div>
              {health.checks.azureKeyVault.responseTime !== undefined && (
                <div className="check-detail">
                  <span className="detail-label">Response Time:</span>
                  <span className="detail-value">{health.checks.azureKeyVault.responseTime}ms</span>
                </div>
              )}
              {health.checks.azureKeyVault.error && (
                <div className="error-message">
                  <AlertTriangle size={16} />
                  {health.checks.azureKeyVault.error}
                </div>
              )}
            </div>
          </div>
        </Card>
        )}

        {/* Static Web Apps Check */}
        {health.checks.staticWebApps && (
        <Card className={`health-check status-${getStatusClass(health.checks.staticWebApps.status)}`}>
          <div className="card-header">
            <div className="check-header">
              {getStatusIcon(health.checks.staticWebApps.status)}
              <h3>Static Web Apps</h3>
            </div>
          </div>
          <div className="card-body">
            <div className="check-details">
              <div className="check-detail">
                <span className="detail-label">Status:</span>
                <span className="detail-value">{health.checks.staticWebApps.status}</span>
              </div>
              {health.checks.staticWebApps.responseTime !== undefined && (
                <div className="check-detail">
                  <span className="detail-label">Response Time:</span>
                  <span className="detail-value">{health.checks.staticWebApps.responseTime}ms</span>
                </div>
              )}
              {health.checks.staticWebApps.details && (
                <>
                  <div className="check-detail">
                    <span className="detail-label">Admin Portal:</span>
                    <span className="detail-value">{health.checks.staticWebApps.details.adminPortal}</span>
                  </div>
                  <div className="check-detail">
                    <span className="detail-label">Member Portal:</span>
                    <span className="detail-value">{health.checks.staticWebApps.details.memberPortal}</span>
                  </div>
                </>
              )}
              {health.checks.staticWebApps.error && (
                <div className="error-message">
                  <AlertTriangle size={16} />
                  {health.checks.staticWebApps.error}
                </div>
              )}
            </div>
          </div>
        </Card>
        )}
      </div>
      )}
    </div>
  );
};
