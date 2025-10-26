import type { IPublicClientApplication } from '@azure/msal-browser';
import {
  AuthenticatedTemplate,
  MsalProvider,
  UnauthenticatedTemplate,
  useMsal,
} from '@azure/msal-react';
import { Fade } from '@progress/kendo-react-animation';
import { Button } from '@progress/kendo-react-buttons';
import { Notification, NotificationGroup } from '@progress/kendo-react-notification';
import { LogOut } from 'lucide-react';
import React, { useEffect, useState } from 'react';

import './kendoLicense';
import '@progress/kendo-theme-default/dist/all.css';
import './App.css';

import { APIAccessView } from './components/APIAccessView';
import { ContactsView } from './components/ContactsView';
import { Dashboard } from './components/Dashboard';
import { EndpointsView } from './components/EndpointsView';
import LanguageSwitcher from './components/LanguageSwitcher';
import { ProfileView } from './components/ProfileView';
import { Support } from './components/Support';

interface AppContentProps {
  instance: IPublicClientApplication;
}

type TabType = 'dashboard' | 'profile' | 'contacts' | 'integrations' | 'api-access' | 'support';

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

interface NotificationData {
  id: number;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

function AppContent({ instance }: AppContentProps) {
  const { instance: msal, accounts } = useMsal();
  const [memberData, setMemberData] = useState<MemberData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [notificationId, setNotificationId] = useState(1);

  useEffect(() => {
    if (accounts.length > 0) {
      fetchMemberData();
    }
  }, [accounts]);

  const showNotification = (
    message: string,
    type: 'success' | 'error' | 'warning' | 'info' = 'success'
  ) => {
    const id = notificationId;
    setNotificationId(id + 1);
    setNotifications((prev) => [...prev, { id, type, message }]);

    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 5000);
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
      case 'support':
        return <Support />;
      default:
        return <Dashboard {...commonProps} />;
    }
  };

  return (
    <div className="App">
      <NotificationGroup style={{ right: 20, top: 80, alignItems: 'flex-end', zIndex: 10000 }}>
        {notifications.map((notification) => (
          <Fade key={notification.id} enter exit>
            <Notification
              type={{ style: notification.type, icon: true }}
              closable={true}
              onClose={() =>
                setNotifications((prev) => prev.filter((n) => n.id !== notification.id))
              }
            >
              <span>{notification.message}</span>
            </Notification>
          </Fade>
        ))}
      </NotificationGroup>

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
                  fillMode="flat"
                  onClick={handleLogout}
                  title="Sign out"
                  className="logout-button"
                >
                  <LogOut size={16} /> Sign Out
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
          <div className="welcome-container">
            <div className="welcome-card">
              <h2>Welcome to CTN Member Portal</h2>
              <p>
                Access your organization's CTN network dashboard, manage contacts, configure system
                integrations, and manage API access for secure data exchange.
              </p>
              <Button
                onClick={handleLogin}
                themeColor="primary"
                size="large"
                className="login-button"
              >
                Sign In with Azure AD
              </Button>
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
                themeColor="primary"
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
    <MsalProvider instance={instance}>
      <AppContent instance={instance} />
    </MsalProvider>
  );
}

export default App;
