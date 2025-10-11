import React, { useState } from 'react';
import { Button } from '@progress/kendo-react-buttons';
import { User, Key, Mail, HelpCircle } from 'lucide-react';
import './App.css';
import '@progress/kendo-theme-default/dist/all.css';

function App() {
  const [view, setView] = useState<'home' | 'profile' | 'tokens'>('home');

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <img 
            src="/assets/logos/ctn-logo.svg" 
            alt="CTN Logo" 
            className="header-logo"
          />
          <div className="header-text">
            <h1>Member Portal</h1>
            <p>Association Member Self-Service</p>
          </div>
        </div>
      </header>

      <nav className="nav">
        <Button onClick={() => setView('home')} fillMode={view === 'home' ? 'solid' : 'flat'}>
          <User size={18} /> Home
        </Button>
        <Button onClick={() => setView('profile')} fillMode={view === 'profile' ? 'solid' : 'flat'}>
          <User size={18} /> My Profile
        </Button>
        <Button onClick={() => setView('tokens')} fillMode={view === 'tokens' ? 'solid' : 'flat'}>
          <Key size={18} /> My Tokens
        </Button>
      </nav>

      <main className="content">
        {view === 'home' && (
          <div className="welcome">
            <h2>Welcome to CTN Member Portal</h2>
            <p>Access your member profile, manage tokens, and request support.</p>
            
            <div className="features">
              <div className="feature-card">
                <User size={32} />
                <h3>Your Profile</h3>
                <p>View and manage your member information</p>
              </div>
              <div className="feature-card">
                <Key size={32} />
                <h3>Access Tokens</h3>
                <p>Download and manage your API tokens</p>
              </div>
              <div className="feature-card">
                <HelpCircle size={32} />
                <h3>Support</h3>
                <p>Get help and submit support tickets</p>
              </div>
            </div>
          </div>
        )}

        {view === 'profile' && (
          <div className="profile">
            <h2>My Profile</h2>
            <div className="profile-info">
              <div className="info-row">
                <label>Organization ID:</label>
                <span>org:example-company</span>
              </div>
              <div className="info-row">
                <label>Legal Name:</label>
                <span>Example Company BV</span>
              </div>
              <div className="info-row">
                <label>Domain:</label>
                <span>example.com</span>
              </div>
              <div className="info-row">
                <label>Status:</label>
                <span className="badge active">ACTIVE</span>
              </div>
              <div className="info-row">
                <label>Membership Level:</label>
                <span className="badge premium">PREMIUM</span>
              </div>
            </div>
            <p className="note">
              <Mail size={16} /> To update your profile, contact the administrator
            </p>
          </div>
        )}

        {view === 'tokens' && (
          <div className="tokens">
            <h2>My Tokens</h2>
            <p>Download your access tokens for API integration.</p>
            <div className="token-actions">
              <Button themeColor="primary">
                <Key size={18} /> Download Current Token
              </Button>
            </div>
            <p className="note">Tokens are valid for 24 hours and can be refreshed.</p>
          </div>
        )}
      </main>

      <footer className="footer">
        <div className="footer-content">
          <div className="partner-logos">
            <p>In partnership with:</p>
            <div className="logos-row">
              <img src="/assets/logos/portbase-logo.svg" alt="Portbase" />
              <img src="/assets/logos/contargo-logo.svg" alt="Contargo" />
            </div>
          </div>
          <p className="footer-text">© 2025 CTN Association Register | <a href="#contact">Contact Support</a></p>
        </div>
      </footer>
    </div>
  );
}

export default App;
