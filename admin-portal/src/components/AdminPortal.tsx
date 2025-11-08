/**
 * Admin Portal Component
 * Main container for authenticated admin interface
 */

import { AppShell, Burger, Button, Container, Group, Tooltip, ActionIcon, useMantineColorScheme, useComputedColorScheme } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';

import { LogOut, User, Sun, Moon } from './icons';
import type React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/AuthContext';
import { RoleGuard } from '../auth/ProtectedRoute';
import { UserRole } from '../auth/authConfig';
import { useNotification } from '../contexts/NotificationContext';
import { useAsync } from '../hooks/useAsync';
import { type Member, api } from '../services/api';
import { logger } from '../utils/logger';
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
import { ReviewTasks } from './ReviewTasks';
import Settings from './Settings';
import { SkipToContent } from './SkipToContent';
import TasksGrid from './TasksGrid';
import AuditLogViewer from './audit/AuditLogViewer';
import UserManagement from './users/UserManagement';
import './AdminPortal.css';
import { TEXT_COLORS } from '../utils/colors';

const AdminPortal: React.FC = () => {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const notification = useNotification();
  const { setColorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true });

  const [members, setMembers] = useState<Member[]>([]);
  const [totalMembers, setTotalMembers] = useState<number>(0);
  const [showForm, setShowForm] = useState(false);
  const [navbarOpened, { toggle: toggleNavbar }] = useDisclosure(true);
  const [selectedView, setSelectedView] = useState<string>('dashboard');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  // Memoize useAsync options to prevent infinite re-renders
  const asyncOptions = useMemo(
    () => ({
      showErrorNotification: true,
      errorMessage: 'Failed to load members',
    }),
    []
  );

  const { loading, execute: loadMembers } = useAsync(asyncOptions);

  const loadMembersData = useCallback(
    async () => {
      try {
        // Load ALL members for client-side pagination (no pagination params)
        const result = await loadMembers(() => api.getMembers()) as Member[] | { data: Member[]; total: number };

        // api.getMembers() without params returns Member[] directly (not { data, total })
        const membersArray = Array.isArray(result) ? result : result.data;
        setMembers(membersArray);
        setTotalMembers(membersArray.length);
      } catch (error) {
        // Handled by useAsync hook, but log for debugging (CR-004)
        logger.error('Failed to load members data:', error);
      }
    },
    [loadMembers]
  );

  useEffect(() => {
    loadMembersData();
  }, [loadMembersData]);

  const handleFormSubmit = useCallback(
    async (formData: MemberFormData) => {
      await api.createMember(formData);
      setShowForm(false);
      notification.showSuccess('Member registered successfully!');
      await loadMembersData();
    },
    [notification, loadMembersData]
  );

  const handleViewDetails = useCallback((member: Member) => {
    setSelectedMember(member);
    setSelectedView('member-detail');
  }, []);

  const handleBackToMembers = useCallback(() => {
    setSelectedMember(null);
    setSelectedView('members');
  }, []);

  const handleMenuSelect = useCallback((item: MenuItem) => {
    if (item.route) {
      setSelectedView(item.route);
      setSelectedMember(null);
    }
  }, []);

  const handleLogout = useCallback(async () => {
    await logout();
  }, [logout]);

  // Redirect to members view if trying to view member-detail without a selected member
  // This prevents setState during render (React anti-pattern)
  useEffect(() => {
    if (selectedView === 'member-detail' && !selectedMember) {
      setSelectedView('members');
    }
  }, [selectedView, selectedMember]);

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
                  color="blue"
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
                onViewDetails={handleViewDetails}
                loading={loading}
                onRefresh={loadMembersData}
              />
            )}
          </div>
        );

      case 'member-detail':
        // If no member selected, useEffect will redirect to members view
        if (!selectedMember) {
          return null;
        }
        return (
          <MemberDetailView
            member={selectedMember}
            onBack={handleBackToMembers}
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
                    color="blue"
                    aria-label={t('navigation.members')}
                  >
                    {t('navigation.members')}
                  </Button>
                </div>
              )}
            </RoleGuard>
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
            <h2 style={{ fontSize: '3rem', color: TEXT_COLORS.info, marginBottom: '1rem' }}>404</h2>
            <h3>{t('errors.pageNotFound', 'Page Not Found')}</h3>
            <p style={{ color: TEXT_COLORS.secondary, marginBottom: '2rem' }}>
              {t('errors.pageNotFoundMessage', 'The view you\'re looking for doesn\'t exist.')}
            </p>
            <Button
              color="blue"
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
    <>
      <SkipToContent />
      <AppShell
        header={{ height: 60 }}
        navbar={{
          width: 240,
          breakpoint: 'sm',
          collapsed: { desktop: !navbarOpened },
        }}
        padding="md"
      >
        <AppShell.Header>
          <Container size="xl" h="100%">
            <Group h="100%" px="md" justify="space-between">
              <Group>
                <Burger
                  opened={navbarOpened}
                  onClick={toggleNavbar}
                  size="sm"
                  aria-label={navbarOpened ? 'Collapse sidebar' : 'Expand sidebar'}
                />
                <img src="/assets/logos/ctn.png" alt="CTN Logo" style={{ height: 40 }} />
                <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600 }}>{t('common.appNameShort')}</h1>
              </Group>
              <Group>
                <Tooltip label={computedColorScheme === 'light' ? 'Dark mode' : 'Light mode'} position="bottom">
                  <ActionIcon
                    onClick={() => setColorScheme(computedColorScheme === 'light' ? 'dark' : 'light')}
                    variant="default"
                    size="lg"
                    aria-label="Toggle color scheme"
                  >
                    {computedColorScheme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
                  </ActionIcon>
                </Tooltip>
                <LanguageSwitcher />
                {user && (
                  <Group gap="xs">
                    <User size={18} />
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>{user.account.name}</div>
                      <div style={{ fontSize: 12, color: '#868e96' }}>{user.primaryRole}</div>
                    </div>
                    <Tooltip label="Sign out" position="bottom">
                      <Button
                        variant="subtle"
                        onClick={handleLogout}
                        aria-label="Sign out"
                      >
                        <LogOut size={16} />
                      </Button>
                    </Tooltip>
                  </Group>
                )}
              </Group>
            </Group>
          </Container>
        </AppShell.Header>

        <AppShell.Navbar p="md">
          <AdminSidebar
            expanded={navbarOpened}
            onSelect={handleMenuSelect}
            selectedItem={selectedView === 'member-detail' ? 'members' : selectedView}
          />
        </AppShell.Navbar>

        <AppShell.Main>
          <Container size="xl">
            {renderContent()}
          </Container>

          <footer className="app-footer" style={{ marginTop: 'auto' }}>
            <Container size="xl">
              <Group justify="center" gap="xl" py="lg" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <img src="/assets/logos/contargo.png" alt="Contargo" style={{ height: 40, opacity: 0.9 }} />
                <img src="/assets/logos/Inland Terminals Group.png" alt="Inland Terminals Group" style={{ height: 40, opacity: 0.9 }} />
                <img src="/assets/logos/VanBerkel.png" alt="Van Berkel" style={{ height: 40, opacity: 0.9 }} />
              </Group>
              <div style={{ textAlign: 'center', paddingTop: '1rem', paddingBottom: '1rem', color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.875rem' }}>
                <p>&copy; 2025 Connected Trade Network. All rights reserved.</p>
              </div>
            </Container>
          </footer>
        </AppShell.Main>
      </AppShell>
    </>
  );
};

export default AdminPortal;
