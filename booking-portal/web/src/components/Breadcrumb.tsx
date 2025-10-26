import React from 'react';
import { Link, useLocation } from 'react-router-dom';

interface BreadcrumbItem {
  label: string;
  path?: string;
}

const Breadcrumb: React.FC = () => {
  const location = useLocation();

  const getBreadcrumbs = (): BreadcrumbItem[] => {
    const path = location.pathname;
    const breadcrumbs: BreadcrumbItem[] = [
      { label: 'Dashboard', path: '/dashboard' }
    ];

    if (path.includes('/upload')) {
      breadcrumbs.push({ label: 'Upload' });
    } else if (path.includes('/validate')) {
      breadcrumbs.push({ label: 'Bookings', path: '/bookings' });
      breadcrumbs.push({ label: 'Validation' });
    } else if (path.includes('/bookings')) {
      breadcrumbs.push({ label: 'Bookings' });
    } else if (path.includes('/admin')) {
      breadcrumbs.push({ label: 'Admin' });
    }

    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  if (breadcrumbs.length <= 1) {
    return null;
  }

  return (
    <nav aria-label="Breadcrumb" style={{ marginBottom: '16px' }}>
      <ol style={{
        display: 'flex',
        listStyle: 'none',
        padding: 0,
        margin: 0,
        fontSize: '14px',
        color: '#64748b'
      }}>
        {breadcrumbs.map((crumb, index) => {
          const isLast = index === breadcrumbs.length - 1;

          return (
            <li key={index} style={{ display: 'flex', alignItems: 'center' }}>
              {index > 0 && (
                <span style={{ margin: '0 8px', color: '#cbd5e1' }} aria-hidden="true">
                  /
                </span>
              )}
              {isLast || !crumb.path ? (
                <span
                  aria-current="page"
                  style={{
                    color: '#1e293b',
                    fontWeight: 500
                  }}
                >
                  {crumb.label}
                </span>
              ) : (
                <Link
                  to={crumb.path}
                  style={{
                    color: '#00a3e0',
                    textDecoration: 'none',
                    transition: 'color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                  onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                >
                  {crumb.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default Breadcrumb;
