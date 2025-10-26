import React from 'react';

interface EmptyStateProps {
  title: string;
  description: string;
  actionButton?: React.ReactNode;
  icon?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionButton,
  icon = '📋'
}) => {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        textAlign: 'center',
        padding: '60px 20px',
        color: '#64748b'
      }}
    >
      <div
        style={{
          fontSize: '48px',
          marginBottom: '16px',
          opacity: 0.5
        }}
        aria-hidden="true"
      >
        {icon}
      </div>
      <h3 style={{
        color: '#1e293b',
        marginBottom: '8px',
        fontSize: '18px',
        fontWeight: 600
      }}>
        {title}
      </h3>
      <p style={{
        marginBottom: actionButton ? '24px' : '0',
        maxWidth: '400px',
        margin: '0 auto 24px'
      }}>
        {description}
      </p>
      {actionButton && (
        <div>
          {actionButton}
        </div>
      )}
    </div>
  );
};

export default EmptyState;
