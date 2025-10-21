/**
 * Admin Portal Component
 * Main container for authenticated admin interface
 */

import { Button } from '@progress/kendo-react-buttons';
import { DrawerContent } from '@progress/kendo-react-layout';
import { LogOut, User } from './icons';
import type React from 'react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/AuthContext';
import { RoleGuard } from '../auth/ProtectedRoute';
import { UserRole } from '../auth/authConfig';
import { useNotification } from '../contexts/NotificationContext';
import { useAsync } from '../hooks/useAsync';
import { type Member, api } from '../services/api';
import type { MemberFormData } from '../utils/validation';
import About from './About';
import AdminSidebar, { type MenuItem } from './AdminSidebar';
import Dashboard from './Dashboard';
import { EndpointManagement } from './EndpointManagement';
import { HealthDashboard } from './HealthDashboard';
import LanguageSwitcher from './LanguageSwitcher';
import LoadingSpinner from './LoadingSpinner';
import { MemberDetailView } from './MemberDetailView';
import MemberForm from './MemberForm';
import MembersGrid from './MembersGrid';
import NewslettersGrid from './NewslettersGrid';
import { ReviewTasks } from './ReviewTasks';
import Settings from './Settings';
import SubscriptionsGrid from './SubscriptionsGrid';
import TasksGrid from './TasksGrid';
import AuditLogViewer from './audit/AuditLogViewer';
import UserManagement from './users/UserManagement';
import './AdminPortal.css';

const AdminPortal: React.FC = () => {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const notification = useNotification();

  const [members, setMembers] = useState<Member[]>([]);
  const [totalMembers, setTotalMembers] = useState<number>(0);
  const [showForm, setShowForm] = useState(false);
  const [token, setToken] = useState<string>('');
  const [drawerExpanded, setDrawerExpanded] = useState(true);
  const [selectedView, setSelectedView] = useState<string>('dashboard');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  const { loading, execute: loadMembers } = useAsync({
    showErrorNotification: true,
    errorMessage: 'Failed to load members',
  });

  useEffect(() => {
    loadMembersData();
  }, []);

  const loadMembersData = async (page = 1, pageSize = 20) => {
    try {
      const result = (await loadMembers(() => api.getMembers(page, pageSize))) as {
        data: Member[];
        total: number;
      };
      setMembers(result.data);
      setTotalMembers(result.total);
    } catch (_error) {
      // Handled by useAsync
    }
  };

  const handleFormSubmit = async (formData: MemberFormData) => {
    await api.createMember(formData);
    setShowForm(false);
    notification.showSuccess('Member registered successfully!');
    await loadMembersData();
  };

  const handleViewDetails = (member: Member) => {
    setSelectedMember(member);
    setSelectedView('member-detail');
  };

  const handleBackToMembers = () => {
    setSelectedMember(null);
    setSelectedView('members');
  };

  const handleIssueToken = async (orgId: string) => {
    try {
      const response = await api.issueToken(orgId);
      setToken(response.access_token);
      notification.showSuccess('Token issued successfully!', 'Token Generated');
    } catch (_error) {
      notification.showError('Failed to issue token');
    }
  };

  const handleMenuSelect = (item: MenuItem) => {
    if (item.route) {
      setSelectedView(item.route);
      setSelectedMember(null);
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  const renderContent = () => {
    switch (selectedView) {
      case 'dashboard':
        return <Dashboard members={members} totalMembers={totalMembers} loading={loading} />;

      case 'members':
        return (
          <div className="members-view">
            <div className="view-header">
              <h2>{t('members.title')}</h2>
              <RoleGuard allowedRoles={[UserRole.ASSOCIATION_ADMIN, UserRole.SYSTEM_ADMIN]}>
                <Button
                  themeColor="primary"
                  onClick={() => setShowForm(!showForm)}
                  aria-label={showForm ? t('common.cancel') : t('members.addMember')}
                >
                  {showForm ? t('common.cancel') : `+ ${t('members.addMember')}`}
                </Button>
              </RoleGuard>
            </div>

            {showForm && (
              <MemberForm onSubmit={handleFormSubmit} onCancel={() => setShowForm(false)} />
            )}

            {!showForm && (
              <MembersGrid
                members={members}
                totalMembers={totalMembers}
                onIssueToken={handleIssueToken}
                onViewDetails={handleViewDetails}
                onPageChange={loadMembersData}
                loading={loading}
              />
            )}
          </div>
        );

      case 'member-detail':
        if (!selectedMember) {
          setSelectedView('members');
          return null;
        }
        return (
          <MemberDetailView
            member={selectedMember}
            onBack={handleBackToMembers}
            onIssueToken={handleIssueToken}
          />
        );

      case 'endpoints':
        return (
          <div className="endpoints-view">
            <RoleGuard allowedRoles={[UserRole.ASSOCIATION_ADMIN, UserRole.SYSTEM_ADMIN]}>
              {selectedMember ? (
                <EndpointManagement
                  legalEntityId={selectedMember.org_id}
                  legalEntityName={selectedMember.legal_name}
                />
              ) : (
                <div className="empty-state">
                  <h3>{t('endpoints.title')}</h3>
                  <p>
                    {t(
                      'endpoints.selectMemberFirst',
                      'Select a member from the Members view to manage their endpoints.'
                    )}
                  </p>
                  <Button
                    onClick={() => setSelectedView('members')}
                    themeColor="primary"
                    aria-label={t('navigation.members')}
                  >
                    {t('navigation.members')}
                  </Button>
                </div>
              )}
            </RoleGuard>
          </div>
        );

      case 'tokens':
        return (
          <div className="tokens-view">
            <h2>{t('tokens.title')}</h2>
            {token ? (
              <div className="token-display">
                <h3>{t('tokens.latestToken', 'Latest BVAD Token')}</h3>
                <textarea readOnly value={token} rows={10} className="token-textarea" />
                <Button
                  onClick={() => setToken('')}
                  themeColor="secondary"
                  aria-label={t('tokens.clearToken', 'Clear Token')}
                >
                  {t('tokens.clearToken', 'Clear Token')}
                </Button>
              </div>
            ) : (
              <div className="empty-state">
                <p>
                  {t(
                    'tokens.noTokensGenerated',
                    'No tokens generated yet. Go to Members to issue a token.'
                  )}
                </p>
                <Button
                  onClick={() => setSelectedView('members')}
                  themeColor="primary"
                  aria-label={t('navigation.members')}
                >
                  {t('navigation.members')}
                </Button>
              </div>
            )}
          </div>
        );

      case 'settings':
        return (
          <div className="settings-view">
            <UserManagement />
          </div>
        );

      case 'audit':
        return (
          <div className="audit-view">
            <AuditLogViewer />
          </div>
        );

      case 'health':
        return (
          <div className="health-view">
            <HealthDashboard />
          </div>
        );

      case 'kvk-review':
        return (
          <div className="review-tasks-view">
            <ReviewTasks />
          </div>
        );

      case 'subscriptions':
        return (
          <div className="subscriptions-view">
            <SubscriptionsGrid />
          </div>
        );

      case 'newsletters':
        return (
          <div className="newsletters-view">
            <NewslettersGrid />
          </div>
        );

      case 'tasks':
        return (
          <div className="tasks-view">
            <TasksGrid />
          </div>
        );

      case 'about':
        return <About />;

      case 'docs':
        return <Settings />;

      default:
        return (
          <div className="not-found-view" style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '400px',
            textAlign: 'center',
            padding: '2rem'
          }}>
            <h2 style={{ fontSize: '3rem', color: '#667eea', marginBottom: '1rem' }}>404</h2>
            <h3>{t('errors.pageNotFound', 'Page Not Found')}</h3>
            <p style={{ color: '#4a5568', marginBottom: '2rem' }}>
              {t('errors.pageNotFoundMessage', 'The view you\'re looking for doesn\'t exist.')}
            </p>
            <Button
              themeColor="primary"
              onClick={() => setSelectedView('dashboard')}
              aria-label={t('navigation.dashboard')}
            >
              {t('common.goToDashboard', 'Go to Dashboard')}
            </Button>
          </div>
        );
    }
  };

  return (
    <div className="app-container">
      <AdminSidebar
        expanded={drawerExpanded}
        onSelect={handleMenuSelect}
        selectedItem={selectedView === 'member-detail' ? 'members' : selectedView}
      />
      <DrawerContent>
        <div className="main-content">
          <header className="app-header">
            <div className="header-left">
              <Button
                icon="menu"
                fillMode="flat"
                onClick={() => setDrawerExpanded(!drawerExpanded)}
                className="menu-button"
              >
                {drawerExpanded ? '◀' : '▶'}
              </Button>
              <img src="/assets/logos/ctn.png" alt="CTN Logo" className="header-logo" />
              <h1>{t('common.appNameShort')}</h1>
            </div>
            <div className="header-right">
              <LanguageSwitcher />
              {user && (
                <div className="user-info">
                  <User size={18} />
                  <div className="user-details">
                    <span className="user-name">{user.account.name}</span>
                    <span className="user-role">{user.primaryRole}</span>
                  </div>
                  <Button
                    fillMode="flat"
                    onClick={handleLogout}
                    title="Sign out"
                    aria-label="Sign out"
                  >
                    <LogOut size={16} />
                  </Button>
                </div>
              )}
            </div>
          </header>
          <main className="content-area">{renderContent()}</main>
        </div>
      </DrawerContent>
    </div>
  );
};

export default AdminPortal;
