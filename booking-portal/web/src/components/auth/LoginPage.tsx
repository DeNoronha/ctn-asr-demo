/**
 * Login Page - CTN DocuFlow
 * Azure AD authentication entry point
 */

import { useEffect } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';


export const LoginPage = () => {
  const { login, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (isAuthenticated) {
      // Redirect to the page user was trying to access, or dashboard
      const from = (location.state as any)?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  const handleLogin = async () => {
    try {
      await login();
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #3a6b8f 0%, #5a8db5 100%)'
      }}>
        <div className="k-loading k-loading-lg" />
      </div>
    );
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #3a6b8f 0%, #5a8db5 100%)',
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        padding: '3rem',
        borderRadius: '12px',
        borderTop: '4px solid #f5a623',
        boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
        textAlign: 'center',
        maxWidth: '500px',
        width: '100%'
      }}>
        {/* CTN Logo */}
        <div style={{
          width: '80px',
          height: '80px',
          margin: '0 auto 1.5rem',
          background: '#2c5a7a',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '32px',
          fontWeight: 'bold',
          color: 'white',
          fontFamily: 'Arial, sans-serif'
        }}>
          <span style={{ color: '#5a9bc5' }}>c</span>
          <span style={{ color: 'white' }}>t</span>
          <span style={{ color: '#f5a623' }}>n</span>
        </div>

        {/* Title */}
        <h1 style={{
          fontSize: '28px',
          fontWeight: 600,
          color: '#2c5a7a',
          marginBottom: '0.5rem'
        }}>
          CTN DocuFlow
        </h1>
        <p style={{
          fontSize: '16px',
          color: '#6b7280',
          marginBottom: '2rem'
        }}>
          Intelligent Document Processing Portal
        </p>

        {/* Security Requirements Box */}
        <div style={{
          background: '#f0f7ff',
          border: '1px solid #b8d4e8',
          borderRadius: '8px',
          padding: '1.25rem',
          marginBottom: '2rem',
          textAlign: 'left'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '20px', marginRight: '8px' }}>🛡️</span>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#2c5a7a', margin: 0 }}>
              Security Requirements
            </h3>
          </div>
          <ul style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
            fontSize: '14px',
            color: '#4b5563'
          }}>
            <li style={{ marginBottom: '0.5rem', paddingLeft: '1.5rem', position: 'relative' }}>
              <span style={{ position: 'absolute', left: 0 }}>•</span>
              All users must register via Member Portal first
            </li>
            <li style={{ marginBottom: '0.5rem', paddingLeft: '1.5rem', position: 'relative' }}>
              <span style={{ position: 'absolute', left: 0 }}>•</span>
              Multi-Factor Authentication (MFA) is required
            </li>
            <li style={{ paddingLeft: '1.5rem', position: 'relative' }}>
              <span style={{ position: 'absolute', left: 0 }}>•</span>
              Cloud-based Azure Entra ID authentication
            </li>
          </ul>
        </div>

        {/* Sign In Button */}
        <button
          onClick={handleLogin}
          style={{
            width: '100%',
            padding: '14px',
            fontSize: '16px',
            fontWeight: 600,
            color: 'white',
            background: '#ef6f5f',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            transition: 'background 0.2s',
            marginBottom: '1.5rem'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#d85f4f';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#ef6f5f';
          }}
        >
          Sign in with Microsoft
        </button>

        {/* Registration Link */}
        <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '1.5rem', marginBottom: '1.5rem' }}>
          <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '0.5rem' }}>
            Don't have an account?
          </p>
          <a
            href="https://members.ctn.nl/register"
            style={{
              color: '#3b82f6',
              fontSize: '14px',
              textDecoration: 'none',
              fontWeight: 500
            }}
          >
            Register on Member Portal
          </a>
        </div>

        {/* Partnership Section */}
        <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '1.5rem' }}>
          <p style={{
            fontSize: '13px',
            color: '#9ca3af',
            marginBottom: '1rem',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            In Partnership With
          </p>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '2rem',
            flexWrap: 'wrap'
          }}>
            <div style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 500 }}>Contargo</div>
            <div style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 500 }}>Inland Terminals</div>
            <div style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 500 }}>van Berkel</div>
          </div>
        </div>
      </div>
    </div>
  );
};
