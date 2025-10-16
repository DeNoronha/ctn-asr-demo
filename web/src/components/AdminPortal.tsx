/**
 * Admin Portal Component
 * Main container for authenticated admin interface
 */

import { Button } from '@progress/kendo-react-buttons';
import { DrawerContent } from '@progress/kendo-react-layout';
import { LogOut, User } from 'lucide-react';
import type React from 'react';
import { useEffect, useState } from 'react';
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
import { KvkReviewQueue } from './KvkReviewQueue';
import LanguageSwitcher from './LanguageSwitcher';
import LoadingSpinner from './LoadingSpinner';
import { MemberDetailView } from './MemberDetailView';
import MemberForm from './MemberForm';
import MembersGrid from './MembersGrid';
import NewslettersGrid from './NewslettersGrid';
import SubscriptionsGrid from './SubscriptionsGrid';
import TasksGrid from './TasksGrid';
import AuditLogViewer from './audit/AuditLogViewer';
import UserManagement from './users/UserManagement';
import './AdminPortal.css';

const AdminPortal: React.FC = () => {
  const { user, logout } = useAuth();
  const notification = useNotification();

  const [members, setMembers] = useState<Member[]>([]);
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

  const loadMembersData = async () => {
    try {
      const data = await loadMembers(() => api.getMembers());
      setMembers(data);
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
    if (loading) {
      return <LoadingSpinner size="large" message="Loading members..." fullScreen />;
    }

    switch (selectedView) {
      case 'dashboard':
        return <Dashboard members={members} />;

      case 'members':
        return (
          <div className="members-view">
            <div className="view-header">
              <h2>Member Directory</h2>
              <RoleGuard allowedRoles={[UserRole.ASSOCIATION_ADMIN, UserRole.SYSTEM_ADMIN]}>
                <Button themeColor="primary" onClick={() => setShowForm(!showForm)}>
                  {showForm ? 'Cancel' : '+ Register New Member'}
                </Button>
              </RoleGuard>
            </div>

            {showForm && (
              <MemberForm onSubmit={handleFormSubmit} onCancel={() => setShowForm(false)} />
            )}

            {!showForm && (
              <MembersGrid
                members={members}
                onIssueToken={handleIssueToken}
                onViewDetails={handleViewDetails}
                loading={false}
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
                  <h3>Endpoint Management</h3>
                  <p>Select a member from the Members view to manage their endpoints.</p>
                  <Button onClick={() => setSelectedView('members')} themeColor="primary">
                    Go to Members
                  </Button>
                </div>
              )}
            </RoleGuard>
          </div>
        );

      case 'tokens':
        return (
          <div className="tokens-view">
            <h2>Token Management</h2>
            {token ? (
              <div className="token-display">
                <h3>Latest BVAD Token</h3>
                <textarea readOnly value={token} rows={10} className="token-textarea" />
                <Button onClick={() => setToken('')} themeColor="secondary">
                  Clear Token
                </Button>
              </div>
            ) : (
              <div className="empty-state">
                <p>No tokens generated yet. Go to Members to issue a token.</p>
                <Button onClick={() => setSelectedView('members')} themeColor="primary">
                  Go to Members
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

      case 'kvk-review':
        return (
          <div className="kvk-review-view">
            <KvkReviewQueue />
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
        return (
          <div className="docs-view">
            <h2>Documentation</h2>
            <div className="docs-content">
              <h3>CTN Association Register</h3>
              <p>Welcome to the CTN Association Register administrative interface.</p>
              <h4>Quick Start</h4>
              <ul>
                <li>
                  Use the <strong>Dashboard</strong> to view key statistics
                </li>
                <li>
                  Manage members in the <strong>Members</strong> section
                </li>
                <li>
                  Manage system endpoints in the <strong>Endpoints</strong> section
                </li>
                <li>
                  Generate and view tokens in <strong>Token Management</strong>
                </li>
              </ul>
            </div>
          </div>
        );

      default:
        return <div>Select a view from the sidebar</div>;
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
              <h1>Association Register</h1>
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
                  <Button fillMode="flat" onClick={handleLogout} title="Sign out">
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
