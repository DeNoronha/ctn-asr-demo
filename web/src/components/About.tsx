/**
 * About Page Component
 * Displays build information for both admin portal and API
 */

import { Badge } from '@progress/kendo-react-indicators';
import { Card, CardBody, CardHeader, CardTitle } from '@progress/kendo-react-layout';
import { AlertCircle, Calendar, CheckCircle, Clock, GitBranch, Package } from './icons';
import type React from 'react';
import { useEffect, useState } from 'react';
import LoadingSpinner from './LoadingSpinner';
import './About.css';

interface VersionInfo {
  buildNumber: string;
  buildId: string;
  commitSha: string;
  commitShaFull: string;
  branch: string;
  timestamp: string;
  version: string;
  environment: string;
}

interface APIVersionInfo extends VersionInfo {
  api: {
    name: string;
    nodeVersion: string;
    platform: string;
    uptime: number;
  };
  copyright: {
    year: number;
    owner: string;
    license: string;
  };
}

const About: React.FC = () => {
  const [portalVersion, setPortalVersion] = useState<VersionInfo | null>(null);
  const [apiVersion, setApiVersion] = useState<APIVersionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadVersionInfo();
  }, []);

  const loadVersionInfo = async () => {
    try {
      setLoading(true);

      // Load portal version from /version.json
      const portalResponse = await fetch('/version.json');
      if (portalResponse.ok) {
        const portalData = await portalResponse.json();
        setPortalVersion(portalData);
      } else {
        // Fallback for local development
        setPortalVersion({
          buildNumber: 'dev',
          buildId: '0',
          commitSha: 'local',
          commitShaFull: 'local-development',
          branch: 'local',
          timestamp: new Date().toISOString(),
          version: 'dev',
          environment: 'local',
        });
      }

      // Load API version from /api/v1/version
      const apiResponse = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:7071/api/v1'}/version`
      );
      if (apiResponse.ok) {
        const apiData = await apiResponse.json();
        setApiVersion(apiData);
      }

      setLoading(false);
    } catch (err) {
      console.error('Failed to load version info:', err);
      setError('Failed to load version information');
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    });
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    }
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getEnvironmentBadge = (environment: string) => {
    const envLower = environment.toLowerCase();
    // Only show Production badge for production environment
    if (envLower === 'production' || envLower === 'prod') {
      return (
        <Badge themeColor="success" size="medium">
          Production
        </Badge>
      );
    }
    // Don't show environment badge for dev/local
    return null;
  };

  const isProductionBuild = (buildNumber: string) => {
    return buildNumber !== 'dev' && buildNumber !== 'local' && buildNumber !== '0';
  };

  if (loading) {
    return <LoadingSpinner size="large" message="Loading version information..." fullScreen />;
  }

  if (error) {
    return (
      <div className="about-error">
        <AlertCircle size={48} />
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="about-view">
      <h2>About CTN Association Register</h2>

      <div className="about-grid">
        {/* Admin Portal Version Card */}
        <Card className="version-card">
          <CardHeader>
            <CardTitle>
              <Package size={20} />
              Admin Portal
            </CardTitle>
          </CardHeader>
          <CardBody>
            {portalVersion && (
              <div className="version-details">
                {isProductionBuild(portalVersion.buildNumber) && (
                  <>
                    <div className="version-item">
                      <strong>Version:</strong>
                      <span className="version-number">#{portalVersion.version}</span>
                    </div>
                    <div className="version-item">
                      <strong>Build Number:</strong>
                      <span>{portalVersion.buildNumber}</span>
                    </div>
                  </>
                )}
                {getEnvironmentBadge(portalVersion.environment) && (
                  <div className="version-item">
                    <strong>Environment:</strong>
                    {getEnvironmentBadge(portalVersion.environment)}
                  </div>
                )}
                {portalVersion.branch &&
                  portalVersion.branch !== 'unknown' &&
                  portalVersion.branch !== 'local' && (
                    <div className="version-item">
                      <GitBranch size={16} />
                      <strong>Branch:</strong>
                      <span>{portalVersion.branch}</span>
                    </div>
                  )}
                {portalVersion.commitSha &&
                  portalVersion.commitSha !== 'unknown' &&
                  portalVersion.commitSha !== 'local' && (
                    <div className="version-item">
                      <strong>Commit:</strong>
                      <code className="commit-sha">{portalVersion.commitSha}</code>
                    </div>
                  )}
                <div className="version-item">
                  <Calendar size={16} />
                  <strong>Built:</strong>
                  <span>{formatTimestamp(portalVersion.timestamp)}</span>
                </div>
              </div>
            )}
          </CardBody>
        </Card>

        {/* API Version Card */}
        <Card className="version-card">
          <CardHeader>
            <CardTitle>
              <Package size={20} />
              Backend API
            </CardTitle>
          </CardHeader>
          <CardBody>
            {apiVersion ? (
              <div className="version-details">
                <div className="version-item">
                  <CheckCircle size={16} className="status-online" />
                  <strong>Status:</strong>
                  <span className="status-text">Online</span>
                </div>
                {isProductionBuild(apiVersion.buildNumber) && (
                  <>
                    <div className="version-item">
                      <strong>Version:</strong>
                      <span className="version-number">#{apiVersion.version}</span>
                    </div>
                    <div className="version-item">
                      <strong>Build Number:</strong>
                      <span>{apiVersion.buildNumber}</span>
                    </div>
                  </>
                )}
                {getEnvironmentBadge(apiVersion.environment) && (
                  <div className="version-item">
                    <strong>Environment:</strong>
                    {getEnvironmentBadge(apiVersion.environment)}
                  </div>
                )}
                {apiVersion.branch &&
                  apiVersion.branch !== 'unknown' &&
                  apiVersion.branch !== 'local' && (
                    <div className="version-item">
                      <GitBranch size={16} />
                      <strong>Branch:</strong>
                      <span>{apiVersion.branch}</span>
                    </div>
                  )}
                {apiVersion.commitSha &&
                  apiVersion.commitSha !== 'unknown' &&
                  apiVersion.commitSha !== 'local' && (
                    <div className="version-item">
                      <strong>Commit:</strong>
                      <code className="commit-sha">{apiVersion.commitSha}</code>
                    </div>
                  )}
                <div className="version-item">
                  <Calendar size={16} />
                  <strong>Built:</strong>
                  <span>{formatTimestamp(apiVersion.timestamp)}</span>
                </div>
                <div className="version-item">
                  <Clock size={16} />
                  <strong>Uptime:</strong>
                  <span>{formatUptime(apiVersion.api.uptime)}</span>
                </div>
                <div className="version-item">
                  <strong>Node.js:</strong>
                  <span>{apiVersion.api.nodeVersion}</span>
                </div>
              </div>
            ) : (
              <div className="version-unavailable">
                <AlertCircle size={16} />
                <span>API version information unavailable</span>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Copyright Information */}
      {apiVersion?.copyright && (
        <div className="copyright-footer">
          <p>
            © {apiVersion.copyright.year} {apiVersion.copyright.owner}
          </p>
        </div>
      )}

      {/* Partner Logos - Same as Dashboard */}
      <div className="partner-logos">
        <h3>In Partnership With</h3>
        <div className="logos-grid">
          <div className="logo-container">
            <img src="/assets/logos/portbase.png" alt="Portbase" />
          </div>
          <div className="logo-container">
            <img src="/assets/logos/contargo.png" alt="Contargo" />
          </div>
          <div className="logo-container">
            <img src="/assets/logos/Inland Terminals Group.png" alt="Inland Terminals Group" />
          </div>
          <div className="logo-container">
            <img src="/assets/logos/VanBerkel.png" alt="Van Berkel" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;
