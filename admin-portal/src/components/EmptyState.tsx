import type React from 'react';
import './EmptyState.css';

interface EmptyStateProps {
  message: string;
  hint?: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
  size?: 'normal' | 'small';
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  message,
  hint,
  icon,
  action,
  size = 'normal',
}) => {
  return (
    <div className={`empty-state ${size === 'small' ? 'empty-state-small' : ''}`}>
      {icon && <div className="empty-state-icon">{icon}</div>}
      <p className="empty-state-message">{message}</p>
      {hint && <p className="empty-state-hint">{hint}</p>}
      {action && (
        <button className="empty-state-action" onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  );
};
