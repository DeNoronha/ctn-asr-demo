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

/**
 * EmptyState component with WCAG 2.1 AA compliance (DA-004)
 * - Semantic HTML with proper ARIA roles
 * - Screen reader announcements via aria-live
 * - Descriptive labels for assistive technology
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  message,
  hint,
  icon,
  action,
  size = 'normal',
}) => {
  // Create accessible label combining message and hint
  const ariaLabel = hint ? `${message}. ${hint}` : message;

  return (
    <div
      className={`empty-state ${size === 'small' ? 'empty-state-small' : ''}`}
      role="status"
      aria-live="polite"
      aria-label={ariaLabel}
    >
      {icon && (
        <div className="empty-state-icon" aria-hidden="true">
          {icon}
        </div>
      )}
      <p className="empty-state-message">{message}</p>
      {hint && <p className="empty-state-hint">{hint}</p>}
      {action && (
        <button
          className="empty-state-action"
          onClick={action.onClick}
          aria-label={`${action.label}: ${message}`}
        >
          {action.label}
        </button>
      )}
    </div>
  );
};
