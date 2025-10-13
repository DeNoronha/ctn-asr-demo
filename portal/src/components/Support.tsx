import type React from 'react';

export const Support: React.FC = () => {
  return (
    <div className="support-view">
      <div className="page-header">
        <h2>Support & Resources</h2>
        <p className="page-subtitle">Get help and access documentation</p>
      </div>

      <div className="card-grid">
        <div className="card">
          <div className="card-header">
            <h3>📧 Contact Support</h3>
          </div>
          <p style={{ marginBottom: '1rem', color: 'var(--ctn-text-light)' }}>
            Need help? Our support team is here to assist you.
          </p>
          <div className="info-grid">
            <div className="info-item">
              <strong>Email:</strong>
              <a href="mailto:support@ctn-network.org">support@ctn-network.org</a>
            </div>
            <div className="info-item">
              <strong>Response Time:</strong>
              <span>Within 24 hours</span>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>📚 Documentation</h3>
          </div>
          <p style={{ marginBottom: '1rem', color: 'var(--ctn-text-light)' }}>
            Browse our comprehensive documentation and guides.
          </p>
          <ul className="simple-list">
            <li>
              <a href="javascript:void(0)" target="_blank" rel="noopener noreferrer">
                Getting Started Guide
              </a>
            </li>
            <li>
              <a href="javascript:void(0)" target="_blank" rel="noopener noreferrer">
                API Documentation
              </a>
            </li>
            <li>
              <a href="javascript:void(0)" target="_blank" rel="noopener noreferrer">
                Integration Examples
              </a>
            </li>
            <li>
              <a href="javascript:void(0)" target="_blank" rel="noopener noreferrer">
                Troubleshooting Guide
              </a>
            </li>
          </ul>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>💬 Community</h3>
          </div>
          <p style={{ marginBottom: '1rem', color: 'var(--ctn-text-light)' }}>
            Connect with other CTN members and stay informed.
          </p>
          <ul className="simple-list">
            <li>
              <a href="javascript:void(0)" target="_blank" rel="noopener noreferrer">
                Member Forum
              </a>
            </li>
            <li>
              <a href="javascript:void(0)" target="_blank" rel="noopener noreferrer">
                Technical Blog
              </a>
            </li>
            <li>
              <a href="javascript:void(0)" target="_blank" rel="noopener noreferrer">
                Webinars & Events
              </a>
            </li>
            <li>
              <a href="javascript:void(0)" target="_blank" rel="noopener noreferrer">
                Release Notes
              </a>
            </li>
          </ul>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>⚙️ System Status</h3>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '1rem',
              background: '#d1fae5',
              borderRadius: '6px',
              marginBottom: '1rem',
            }}
          >
            <div
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: '#10b981',
              }}
            ></div>
            <span style={{ fontWeight: 600, color: '#065f46' }}>All Systems Operational</span>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--ctn-text-light)' }}>
            Last updated: Just now
          </p>
          <a
            href="javascript:void(0)"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: 'var(--ctn-orange)',
              textDecoration: 'none',
              fontSize: '0.9rem',
            }}
          >
            View Detailed Status →
          </a>
        </div>
      </div>

      <div className="card" style={{ marginTop: '2rem' }}>
        <div className="card-header">
          <h3>Frequently Asked Questions</h3>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="faq-item">
            <h4 style={{ color: 'var(--ctn-dark-blue)', marginBottom: '0.5rem' }}>
              How do I generate an API token?
            </h4>
            <p style={{ color: 'var(--ctn-text-light)', lineHeight: 1.6 }}>
              Navigate to the "API Tokens" tab and click "Generate New Token". The token will be
              displayed once - make sure to copy it immediately and store it securely. You can view
              your token history but not the actual tokens.
            </p>
          </div>

          <div className="faq-item">
            <h4 style={{ color: 'var(--ctn-dark-blue)', marginBottom: '0.5rem' }}>
              How do I add a new data endpoint?
            </h4>
            <p style={{ color: 'var(--ctn-text-light)', lineHeight: 1.6 }}>
              Go to the "Endpoints" tab and click "Add Endpoint". Fill in your endpoint details
              including the URL, type, and authentication method. Once created, you can test the
              connection to verify it's working correctly.
            </p>
          </div>

          <div className="faq-item">
            <h4 style={{ color: 'var(--ctn-dark-blue)', marginBottom: '0.5rem' }}>
              What is my organization status?
            </h4>
            <p style={{ color: 'var(--ctn-text-light)', lineHeight: 1.6 }}>
              Your organization status shows whether you're PENDING, ACTIVE, or SUSPENDED. Active
              members have full access to the CTN network. You can view your status on the
              Dashboard. Contact support if you have questions about your status.
            </p>
          </div>

          <div className="faq-item">
            <h4 style={{ color: 'var(--ctn-dark-blue)', marginBottom: '0.5rem' }}>
              How do I update my organization details?
            </h4>
            <p style={{ color: 'var(--ctn-text-light)', lineHeight: 1.6 }}>
              Visit the "Organization Profile" tab and click "Edit Profile". You can update your
              domain, address, and other organization information. All changes are logged for audit
              purposes.
            </p>
          </div>

          <div className="faq-item">
            <h4 style={{ color: 'var(--ctn-dark-blue)', marginBottom: '0.5rem' }}>
              Who can access the Member Portal?
            </h4>
            <p style={{ color: 'var(--ctn-text-light)', lineHeight: 1.6 }}>
              Access to the Member Portal is controlled through Azure AD authentication. Contacts
              registered in your organization's contact list with active accounts can sign in.
              Contact support to add or remove portal access for users.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
