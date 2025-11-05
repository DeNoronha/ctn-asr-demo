import type { IPublicClientApplication } from '@azure/msal-browser';
import {
  AuthenticatedTemplate,
  MsalProvider,
  UnauthenticatedTemplate,
  useMsal,
} from '@azure/msal-react';
import React, { useEffect, useState } from 'react';

// Mantine imports
import { MantineProvider, createTheme, Button } from '@mantine/core';
import { Notifications, notifications } from '@mantine/notifications';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/dates/styles.css';

import './App.css';

// Mantine theme configuration
const theme = createTheme({
  primaryColor: 'blue',
  defaultRadius: 'md',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
});

import { APIAccessView } from './components/APIAccessView';
import { ContactsView } from './components/ContactsView';
import { Dashboard } from './components/Dashboard';
import { DnsVerificationView } from './components/DnsVerificationView';
import { EndpointsView } from './components/EndpointsView';
import LanguageSwitcher from './components/LanguageSwitcher';
import { ProfileView } from './components/ProfileView';
import { RegistrationForm } from './components/RegistrationForm';
import { Support } from './components/Support';

interface AppContentProps {
  instance: IPublicClientApplication;
}

type TabType = 'dashboard' | 'profile' | 'contacts' | 'integrations' | 'api-access' | 'dns-verification' | 'support';

interface MemberData {
  organizationId: string;
  legalName: string;
  lei?: string;
  kvk?: string;
  domain: string;
  status: string;
  membershipLevel: string;
  createdAt: string;
  entityName?: string;
  entityType?: string;
  contactName?: string;
  email?: string;
  jobTitle?: string;
}

function AppContent({ instance }: AppContentProps) {
  const { instance: msal, accounts } = useMsal();
  const [memberData, setMemberData] = useState<MemberData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [showRegistration, setShowRegistration] = useState(false);
  const [registrationLoading, setRegistrationLoading] = useState(false);

  useEffect(() => {
    if (accounts.length > 0) {
      fetchMemberData();
    }
  }, [accounts]);

  const showNotification = (
    message: string,
    type: 'success' | 'error' | 'warning' | 'info' = 'success'
  ) => {
    notifications.show({
      title: type === 'error' ? 'Error' : type === 'warning' ? 'Warning' : type === 'info' ? 'Info' : 'Success',
      message,
      color: type === 'error' ? 'red' : type === 'warning' ? 'yellow' : type === 'info' ? 'blue' : 'green',
      autoClose: 5000,
    });
  };

  const fetchMemberData = async () => {
    setLoading(true);
    setError(null);

    try {
      const account = accounts[0];

      const tokenResponse = await msal.acquireTokenSilent({
        scopes: [`api://${process.env.VITE_API_CLIENT_ID}/Member.Read`],
        account: account,
      });

      const response = await fetch(`${process.env.VITE_API_BASE_URL}/member`, {
        headers: {
          Authorization: `Bearer ${tokenResponse.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      setMemberData(data);
    } catch (err: unknown) {
      console.error('Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load member information');
      showNotification('Failed to load member information', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getAccessToken = async (): Promise<string> => {
    const account = accounts[0];
    const tokenResponse = await msal.acquireTokenSilent({
      scopes: [`api://${process.env.VITE_API_CLIENT_ID}/Member.Read`],
      account: account,
    });
    return tokenResponse.accessToken;
  };

  const handleLogin = () => {
    msal
      .loginRedirect({
        scopes: [
          'openid',
          'profile',
          'email',
          `api://${process.env.VITE_API_CLIENT_ID}/Member.Read`,
        ],
      })
      .catch((err) => {
        console.error('Login failed:', err);
      });
  };

  const handleLogout = () => {
    msal.logoutRedirect().catch((err) => {
      console.error('Logout failed:', err);
    });
  };

  const handleRegistrationSubmit = async (formData: any) => {
    setRegistrationLoading(true);

    try {
      const response = await fetch(`${process.env.VITE_API_BASE_URL}/register-member`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Registration failed');
      }

      // Show success message with application ID
      showNotification(
        `Registration submitted successfully! Application ID: ${result.applicationId}. You will receive a confirmation email shortly.`,
        'success'
      );

      // Close registration modal
      setShowRegistration(false);
    } catch (error) {
      console.error('Registration error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Registration failed. Please try again or contact support.';
      showNotification(errorMessage, 'error');
    } finally {
      setRegistrationLoading(false);
    }
  };

  const handleRegistrationCancel = () => {
    setShowRegistration(false);
  };

  const renderTabContent = () => {
    if (!memberData) return null;

    const commonProps = {
      apiBaseUrl: process.env.VITE_API_BASE_URL || '',
      getAccessToken,
      memberData,
      onNotification: showNotification,
      onDataChange: fetchMemberData,
    };

    switch (activeTab) {
      case 'dashboard':
        return <Dashboard {...commonProps} />;
      case 'profile':
        return <ProfileView {...commonProps} />;
      case 'contacts':
        return <ContactsView {...commonProps} />;
      case 'integrations':
        return <EndpointsView {...commonProps} />;
      case 'api-access':
        return <APIAccessView {...commonProps} />;
      case 'dns-verification':
        return <DnsVerificationView {...commonProps} />;
      case 'support':
        return <Support />;
      default:
        return <Dashboard {...commonProps} />;
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <div className="header-content">
          <div className="header-left">
            <img src="/assets/logos/ctn small.png" alt="CTN" className="header-ctn-logo" />
            <h1>Member Portal</h1>
          </div>

          <div className="header-right">
            <LanguageSwitcher />
            <AuthenticatedTemplate>
              <div className="user-info">
                <span className="user-name">{accounts[0]?.name || accounts[0]?.username}</span>
                <Button
                  variant="subtle"
                  onClick={handleLogout}
                  title="Sign out"
                  className="logout-button"
                >
                  🚪 Sign Out
                </Button>
              </div>
            </AuthenticatedTemplate>
          </div>
        </div>

        <AuthenticatedTemplate>
          {memberData && (
            <nav className="tab-navigation">
              <button
                type="button"
                className={`tab-button ${activeTab === 'dashboard' ? 'active' : ''}`}
                onClick={() => setActiveTab('dashboard')}
              >
                Dashboard
              </button>
              <button
                type="button"
                className={`tab-button ${activeTab === 'profile' ? 'active' : ''}`}
                onClick={() => setActiveTab('profile')}
              >
                Organization Profile
              </button>
              <button
                type="button"
                className={`tab-button ${activeTab === 'contacts' ? 'active' : ''}`}
                onClick={() => setActiveTab('contacts')}
              >
                Contacts
              </button>
              <button
                type="button"
                className={`tab-button ${activeTab === 'integrations' ? 'active' : ''}`}
                onClick={() => setActiveTab('integrations')}
              >
                System Integrations
              </button>
              <button
                type="button"
                className={`tab-button ${activeTab === 'api-access' ? 'active' : ''}`}
                onClick={() => setActiveTab('api-access')}
              >
                API Access
              </button>
              <button
                type="button"
                className={`tab-button ${activeTab === 'dns-verification' ? 'active' : ''}`}
                onClick={() => setActiveTab('dns-verification')}
              >
                DNS Verification
              </button>
              <button
                type="button"
                className={`tab-button ${activeTab === 'support' ? 'active' : ''}`}
                onClick={() => setActiveTab('support')}
              >
                Support
              </button>
            </nav>
          )}
        </AuthenticatedTemplate>
      </header>

      <main className="App-main">
        <UnauthenticatedTemplate>
          <div className="login-container">
            <div className="login-card">
              <div className="login-header">
                <img src="/assets/logos/ctn.png" alt="CTN" className="login-logo" />
                <h1>CTN Member Portal</h1>
                <p className="login-subtitle">Secure Member Access Portal</p>
              </div>

              <div className="login-info-box">
                <div>
                  <h3>Member Portal Access</h3>
                  <p style={{ fontSize: '14px', color: '#475569', lineHeight: '1.6' }}>
                    Access your organization's CTN network dashboard, manage contacts, configure system
                    integrations, and manage API access for secure data exchange.
                  </p>
                </div>
              </div>

              <Button
                className="login-button"
                color="blue"
                size="lg"
                onClick={handleLogin}
                fullWidth
                style={{ marginBottom: '16px' }}
              >
                Sign In with Azure AD
              </Button>

              <Button
                onClick={() => setShowRegistration(true)}
                size="lg"
                variant="outline"
                color="blue"
                className="register-button"
                fullWidth
              >
                Register as Member
              </Button>

              <div className="login-footer">
                <p>New to CTN? Click "Register as Member" to start the registration process. Already registered? Use "Sign In" to access your portal.</p>
              </div>

              <div className="login-partners">
                <p>In Partnership With</p>
                <div className="partner-logos-login">
                  <img src="/assets/logos/contargo.png" alt="Contargo" />
                  <img src="/assets/logos/Inland Terminals Group.png" alt="Inland Terminals Group" />
                  <img src="/assets/logos/VanBerkel.png" alt="Van Berkel" />
                </div>
              </div>
            </div>
          </div>
        </UnauthenticatedTemplate>

        <AuthenticatedTemplate>
          {loading && (
            <div className="loading-container">
              <div className="loading-spinner" />
              <p>Loading member data...</p>
            </div>
          )}

          {!loading && error && (
            <div className="error-container" style={{
              padding: '40px 20px',
              maxWidth: '600px',
              margin: '0 auto',
              textAlign: 'center'
            }}>
              <h3 style={{ color: '#d32f2f', marginBottom: '16px' }}>Unable to Load Member Data</h3>
              <p style={{ marginBottom: '8px' }}>{error}</p>
              <p style={{ color: '#666', fontSize: '0.9em', marginTop: '16px' }}>
                Please try refreshing the page. If the problem persists, contact support.
              </p>
              <Button
                onClick={() => window.location.reload()}
                color="blue"
                style={{ marginTop: '16px' }}
              >
                Refresh Page
              </Button>
            </div>
          )}

          {!loading && !error && memberData && (
            <div className="content-container">{renderTabContent()}</div>
          )}

          {!loading && !memberData && !error && (
            <div className="empty-state">
              <h3>No Member Data</h3>
              <p>We couldn't find any member information for your account.</p>
              <p className="text-muted">Please contact support if you believe this is an error.</p>
            </div>
          )}
        </AuthenticatedTemplate>

        {/* Registration Modal */}
        {showRegistration && (
          <div className="registration-modal-overlay" onClick={handleRegistrationCancel}>
            <div className="registration-modal-content" onClick={(e) => e.stopPropagation()}>
              <RegistrationForm
                onSubmit={handleRegistrationSubmit}
                onCancel={handleRegistrationCancel}
                loading={registrationLoading}
              />
            </div>
          </div>
        )}
      </main>

      <footer className="App-footer">
        <div className="footer-content">
          <div className="footer-logos">
            <img src="/assets/logos/DIL.png" alt="Data in Logistics" className="partner-logo-img" />
            <img src="/assets/logos/contargo.png" alt="Contargo" className="partner-logo-img" />
            <img
              src="/assets/logos/Inland Terminals Group.png"
              alt="Inland Terminals Group"
              className="partner-logo-img"
            />
            <img src="/assets/logos/VanBerkel.png" alt="Van Berkel" className="partner-logo-img" />
          </div>

          <div className="footer-bottom">
            <p>&copy; 2025 CTN Network. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

interface AppProps {
  instance: IPublicClientApplication;
}

function App({ instance }: AppProps) {
  return (
    <MantineProvider theme={theme}>
      <Notifications position="top-right" zIndex={10001} />
      <MsalProvider instance={instance}>
        <AppContent instance={instance} />
      </MsalProvider>
    </MantineProvider>
  );
}

export default App;
