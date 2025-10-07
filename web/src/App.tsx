import React, { useState, useEffect } from 'react';
import { DrawerContent } from '@progress/kendo-react-layout';
import { Button } from '@progress/kendo-react-buttons';
import { api, Member } from './services/api';
import AdminSidebar, { MenuItem } from './components/AdminSidebar';
import MembersGrid from './components/MembersGrid';
import './App.css';

// Import Kendo UI theme
import '@progress/kendo-theme-default/dist/all.css';

function App() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [token, setToken] = useState<string>('');
  const [drawerExpanded, setDrawerExpanded] = useState(true);
  const [selectedView, setSelectedView] = useState<string>('members');
  const [formData, setFormData] = useState({
    org_id: '',
    legal_name: '',
    domain: '',
    lei: '',
    kvk: ''
  });

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    try {
      const data = await api.getMembers();
      setMembers(data);
    } catch (error) {
      console.error('Failed to load members:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createMember(formData);
      setFormData({ org_id: '', legal_name: '', domain: '', lei: '', kvk: '' });
      setShowForm(false);
      loadMembers();
    } catch (error) {
      console.error('Failed to create member:', error);
      alert('Failed to create member');
    }
  };

  const handleIssueToken = async (orgId: string) => {
    try {
      const response = await api.issueToken(orgId);
      setToken(response.access_token);
      setSelectedView('tokens');
      alert('Token issued successfully! View it in the Token Management section.');
    } catch (error) {
      console.error('Failed to issue token:', error);
      alert('Failed to issue token');
    }
  };

  const handleMenuSelect = (item: MenuItem) => {
    if (item.route) {
      setSelectedView(item.route);
    }
  };

  const renderContent = () => {
    if (loading) {
      return <div className="loading">Loading members...</div>;
    }

    switch (selectedView) {
      case 'dashboard':
        return (
          <div className="dashboard-view">
            <h2>Dashboard</h2>
            <div className="stats-grid">
              <div className="stat-card">
                <h3>Total Members</h3>
                <div className="stat-value">{members.length}</div>
              </div>
              <div className="stat-card">
                <h3>Active Members</h3>
                <div className="stat-value">
                  {members.filter(m => m.status === 'ACTIVE').length}
                </div>
              </div>
              <div className="stat-card">
                <h3>Pending Members</h3>
                <div className="stat-value">
                  {members.filter(m => m.status === 'PENDING').length}
                </div>
              </div>
              <div className="stat-card">
                <h3>Premium Members</h3>
                <div className="stat-value">
                  {members.filter(m => m.membership_level === 'PREMIUM').length}
                </div>
              </div>
            </div>
          </div>
        );

      case 'members':
        return (
          <div className="members-view">
            <div className="view-header">
              <h2>Member Directory</h2>
              <Button
                themeColor="primary"
                onClick={() => setShowForm(!showForm)}
              >
                {showForm ? 'Cancel' : '+ Register New Member'}
              </Button>
            </div>

            {showForm && (
              <div className="form-card">
                <h3>Register New Member</h3>
                <form onSubmit={handleSubmit} className="member-form">
                  <div className="form-row">
                    <input
                      type="text"
                      placeholder="Organization ID (e.g., org:company)"
                      value={formData.org_id}
                      onChange={(e) => setFormData({ ...formData, org_id: e.target.value })}
                      required
                      className="form-input"
                    />
                    <input
                      type="text"
                      placeholder="Legal Name"
                      value={formData.legal_name}
                      onChange={(e) => setFormData({ ...formData, legal_name: e.target.value })}
                      required
                      className="form-input"
                    />
                  </div>
                  <div className="form-row">
                    <input
                      type="text"
                      placeholder="Domain (e.g., company.com)"
                      value={formData.domain}
                      onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                      required
                      className="form-input"
                    />
                    <input
                      type="text"
                      placeholder="LEI (optional)"
                      value={formData.lei}
                      onChange={(e) => setFormData({ ...formData, lei: e.target.value })}
                      className="form-input"
                    />
                  </div>
                  <div className="form-row">
                    <input
                      type="text"
                      placeholder="KVK Number (optional)"
                      value={formData.kvk}
                      onChange={(e) => setFormData({ ...formData, kvk: e.target.value })}
                      className="form-input"
                    />
                  </div>
                  <Button type="submit" themeColor="primary">
                    Register Member
                  </Button>
                </form>
              </div>
            )}

            <MembersGrid
              members={members}
              onIssueToken={handleIssueToken}
              loading={loading}
            />
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
            <h2>Settings</h2>
            <p>Settings panel coming soon...</p>
          </div>
        );

      case 'docs':
        return (
          <div className="docs-view">
            <h2>Documentation</h2>
            <div className="docs-content">
              <h3>CTN Association Register</h3>
              <p>Welcome to the CTN Association Register administrative interface.</p>
              <h4>Quick Start</h4>
              <ul>
                <li>Use the <strong>Dashboard</strong> to view key statistics</li>
                <li>Manage members in the <strong>Members</strong> section</li>
                <li>Generate and view tokens in <strong>Token Management</strong></li>
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
        selectedItem={selectedView}
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
              <h1>CTN Association Register</h1>
            </div>
            <div className="header-right">
              <span className="header-subtitle">Admin Portal</span>
            </div>
          </header>
          <main className="content-area">
            {renderContent()}
          </main>
        </div>
      </DrawerContent>
    </div>
  );
}

export default App;
