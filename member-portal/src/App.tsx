import type { IPublicClientApplication } from '@azure/msal-browser';
import {
  AuthenticatedTemplate,
  MsalProvider,
  UnauthenticatedTemplate,
  useMsal,
} from '@azure/msal-react';
import React, { useEffect, useState } from 'react';

// Mantine imports
import {
  Button,
  Container,
  Group,
  MantineProvider,
  Paper,
  Stack,
  Tabs,
  Text,
  createTheme,
} from '@mantine/core';
import { Notifications, notifications } from '@mantine/notifications';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/dates/styles.css';

import './App.css';

// Mantine theme configuration
const theme = createTheme({
  primaryColor: 'blue',
  defaultRadius: 'md',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
});

import { APIAccessView } from './components/APIAccessView';
import { ContactsView } from './components/ContactsView';
import { Dashboard } from './components/Dashboard';
import { DirectoryView } from './components/DirectoryView';
import { DnsVerificationView } from './components/DnsVerificationView';
import { EndpointsView } from './components/EndpointsView';
import { IdentifiersView } from './components/IdentifiersView';
import { KvKDocumentView } from './components/KvKDocumentView';
import LanguageSwitcher from './components/LanguageSwitcher';
import { MyAccessGrantsView } from './components/MyAccessGrantsView';
import { ProfileView } from './components/ProfileView';
import { RegistrationForm } from './components/RegistrationForm';
import { Support } from './components/Support';
import { KeyboardShortcutsHelp } from './components/shared/KeyboardShortcutsHelp';
import { useGlobalShortcuts } from './hooks/useGlobalShortcuts';

interface AppContentProps {
  instance: IPublicClientApplication;
}

type TabType =
  | 'dashboard'
  | 'profile'
  | 'contacts'
  | 'identifiers'
  | 'kvk-document'
  | 'integrations'
  | 'directory'
  | 'my-grants'
  | 'api-access'
  | 'dns-verification'
  | 'support';

// Import from types instead of duplicate definition
import type { MemberData, RegistrationFormData } from './types';

function AppContent(_props: AppContentProps) {
  const { instance: msal, accounts } = useMsal();
  const [memberData, setMemberData] = useState<MemberData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [showRegistration, setShowRegistration] = useState(false);
  const [registrationLoading, setRegistrationLoading] = useState(false);

  // Global keyboard shortcuts
  const { helpModalOpened, setHelpModalOpened } = useGlobalShortcuts({
    onNavigate: (route) => {
      setActiveTab(route);
    },
    onSearch: () => {
      // Focus search input if available
      const searchInput = document.querySelector<HTMLInputElement>(
        'input[type="search"], input[placeholder*="Search"], input[placeholder*="search"]'
      );
      searchInput?.focus();
    },
    onNewMember: () => {
      // Show registration modal (only when logged out)
      if (accounts.length === 0) {
        setShowRegistration(true);
      }
    },
  });

  const showNotification = React.useCallback(
    (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
      const notificationConfig = {
        success: { title: 'Success', color: 'green' },
        error: { title: 'Error', color: 'red' },
        warning: { title: 'Warning', color: 'yellow' },
        info: { title: 'Info', color: 'blue' },
      };

      const config = notificationConfig[type];
      notifications.show({
        title: config.title,
        message,
        color: config.color,
        autoClose: 5000,
      });
    },
    []
  );

  const fetchMemberData = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const account = accounts[0];

      const tokenResponse = await msal.acquireTokenSilent({
        scopes: [`api://${import.meta.env.VITE_API_CLIENT_ID}/Member.Read`],
        account: account,
      });

      const response = await fetch(`${import.meta.env.VITE_API_URL}/member`, {
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
  }, [accounts, msal, showNotification]);

  useEffect(() => {
    if (accounts.length > 0) {
      fetchMemberData();
    }
  }, [accounts.length, fetchMemberData]);

  const getAccessToken = async (): Promise<string> => {
    const account = accounts[0];
    const tokenResponse = await msal.acquireTokenSilent({
      scopes: [`api://${import.meta.env.VITE_API_CLIENT_ID}/Member.Read`],
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
          `api://${import.meta.env.VITE_API_CLIENT_ID}/Member.Read`,
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

  const buildRegistrationFormData = (formData: RegistrationFormData): FormData => {
    const formDataToSend = new FormData();

    // String fields
    const stringFields: (keyof Omit<
      RegistrationFormData,
      'termsAccepted' | 'gdprConsent' | 'kvkDocument'
    >)[] = [
      'legalName',
      'kvkNumber',
      'lei',
      'companyAddress',
      'postalCode',
      'city',
      'country',
      'contactName',
      'contactEmail',
      'contactPhone',
      'jobTitle',
      'membershipType',
    ];

    for (const field of stringFields) {
      formDataToSend.append(field, formData[field] || '');
    }

    // Boolean fields
    formDataToSend.append('termsAccepted', formData.termsAccepted ? 'true' : 'false');
    formDataToSend.append('gdprConsent', formData.gdprConsent ? 'true' : 'false');

    // File field
    if (formData.kvkDocument instanceof File) {
      formDataToSend.append('kvkDocument', formData.kvkDocument);
    } else {
      throw new Error('KvK document is required');
    }

    return formDataToSend;
  };

  const handleRegistrationSubmit = async (formData: RegistrationFormData) => {
    setRegistrationLoading(true);

    try {
      const formDataToSend = buildRegistrationFormData(formData);

      const response = await fetch(`${import.meta.env.VITE_API_URL}/register-member`, {
        method: 'POST',
        body: formDataToSend,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Registration failed');
      }

      const successMessage = result.verificationMessage
        ? `${result.verificationMessage}\n\nApplication ID: ${result.applicationId}\n\nYou will receive a confirmation email shortly.`
        : `Registration submitted successfully! Application ID: ${result.applicationId}. You will receive a confirmation email shortly.`;

      showNotification(successMessage, 'success');
      setShowRegistration(false);
    } catch (error) {
      console.error('Registration error:', error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Registration failed. Please try again or contact support.';
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
      apiBaseUrl: import.meta.env.VITE_API_URL || '',
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
      case 'identifiers':
        return <IdentifiersView {...commonProps} />;
      case 'kvk-document':
        return <KvKDocumentView {...commonProps} />;
      case 'integrations':
        return <EndpointsView {...commonProps} />;
      case 'directory':
        return <DirectoryView {...commonProps} />;
      case 'my-grants':
        return <MyAccessGrantsView {...commonProps} />;
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
      <KeyboardShortcutsHelp opened={helpModalOpened} onClose={() => setHelpModalOpened(false)} />
      <AuthenticatedTemplate>
        <header className="App-header">
          <div className="header-content">
            <div className="header-left">
              <img src="/assets/logos/ctn small.png" alt="CTN" className="header-ctn-logo" />
              <h1>Member Portal</h1>
            </div>

            <div className="header-right">
              <LanguageSwitcher />
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
            </div>
          </div>

          {memberData && (
            <Tabs
              value={activeTab}
              onChange={(value) => setActiveTab(value as TabType)}
              variant="pills"
              style={{ padding: '0 24px' }}
              styles={{
                tab: {
                  color: 'rgba(255, 255, 255, 0.8)',
                  fontWeight: 500,
                  '&:hover': {
                    color: 'white',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  },
                  '&[data-active]': {
                    color: 'white',
                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  },
                },
              }}
            >
              <Tabs.List>
                <Tabs.Tab value="dashboard">Dashboard</Tabs.Tab>
                <Tabs.Tab value="profile">Organization Profile</Tabs.Tab>
                <Tabs.Tab value="contacts">Contacts</Tabs.Tab>
                <Tabs.Tab value="identifiers">Legal Identifiers</Tabs.Tab>
                <Tabs.Tab value="kvk-document">KvK Document</Tabs.Tab>
                <Tabs.Tab value="integrations">My Endpoints</Tabs.Tab>
                <Tabs.Tab value="directory">CTN Directory</Tabs.Tab>
                <Tabs.Tab value="my-grants">My Access Grants</Tabs.Tab>
                <Tabs.Tab value="api-access">Access Credentials</Tabs.Tab>
                <Tabs.Tab value="dns-verification">DNS Verification</Tabs.Tab>
                <Tabs.Tab value="support">Support</Tabs.Tab>
              </Tabs.List>
            </Tabs>
          )}
        </header>
      </AuthenticatedTemplate>

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
                    Access your organization's CTN network dashboard, manage contacts, configure
                    system integrations, and manage API access for secure data exchange.
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
                <p>
                  New to CTN? Click "Register as Member" to start the registration process. Already
                  registered? Use "Sign In" to access your portal.
                </p>
              </div>

              <div className="login-partners">
                <p>In Partnership With</p>
                <div className="partner-logos-login">
                  <img src="/assets/logos/contargo.png" alt="Contargo" />
                  <img
                    src="/assets/logos/Inland Terminals Group.png"
                    alt="Inland Terminals Group"
                  />
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
            <div
              className="error-container"
              style={{
                padding: '40px 20px',
                maxWidth: '600px',
                margin: '0 auto',
                textAlign: 'center',
              }}
            >
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
            <Stack
              align="center"
              gap="md"
              py="xl"
              style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}
            >
              <Text size="xl" fw={600}>
                No Member Data
              </Text>
              <Text size="md">We couldn't find any member information for your account.</Text>
              <Text size="sm" c="dimmed">
                Please contact support if you believe this is an error.
              </Text>
            </Stack>
          )}
        </AuthenticatedTemplate>

        {/* Registration Modal */}
        {showRegistration && (
          <div
            className="registration-modal-overlay"
            onClick={handleRegistrationCancel}
            onKeyDown={(e) => e.key === 'Escape' && handleRegistrationCancel()}
            // biome-ignore lint/a11y/useSemanticElements: Overlay backdrop is not a button element
            role="button"
            tabIndex={0}
            aria-label="Close registration modal"
          >
            <div
              className="registration-modal-content"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              // biome-ignore lint/a11y/useSemanticElements: Using Mantine Modal component pattern
              role="dialog"
              aria-modal="true"
            >
              <RegistrationForm
                onSubmit={handleRegistrationSubmit}
                onCancel={handleRegistrationCancel}
                loading={registrationLoading}
              />
            </div>
          </div>
        )}
      </main>

      <AuthenticatedTemplate>
        <Container size="xl" mt="xl">
          <Paper withBorder p="md" radius="md" mt="xl">
            <Group justify="space-between" wrap="wrap">
              <Group>
                <img src="/assets/logos/ctn.png" alt="CTN" style={{ height: 30 }} />
                <Text size="sm" c="dimmed">
                  © 2025 Connected Trade Network. All rights reserved.
                </Text>
              </Group>
              <Group gap="xl">
                <img
                  src="/assets/logos/contargo.png"
                  alt="Contargo"
                  style={{ height: 30, opacity: 0.7 }}
                />
                <img
                  src="/assets/logos/Inland Terminals Group.png"
                  alt="Inland Terminals Group"
                  style={{ height: 30, opacity: 0.7 }}
                />
                <img
                  src="/assets/logos/VanBerkel.png"
                  alt="Van Berkel"
                  style={{ height: 30, opacity: 0.7 }}
                />
              </Group>
            </Group>
          </Paper>
        </Container>
      </AuthenticatedTemplate>
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
