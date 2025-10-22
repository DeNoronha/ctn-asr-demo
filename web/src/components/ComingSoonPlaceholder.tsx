import React from 'react';

interface ComingSoonPlaceholderProps {
  title: string;
  message?: string;
}

export const ComingSoonPlaceholder: React.FC<ComingSoonPlaceholderProps> = ({
  title,
  message = 'This feature is under development and will be available soon.',
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '60vh',
        textAlign: 'center',
        padding: '2rem',
      }}
    >
      <div
        style={{
          fontSize: '4rem',
          marginBottom: '1rem',
          opacity: 0.3,
        }}
      >
        🚧
      </div>
      <h2 style={{ marginBottom: '1rem', color: '#333' }}>{title}</h2>
      <p style={{ color: '#666', maxWidth: '500px' }}>{message}</p>
    </div>
  );
};
