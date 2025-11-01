import { Progress } from '@mantine/core';
// ProgressIndicator.tsx - Progress bar for long operations
import type React from 'react';
import './ProgressIndicator.css';

interface ProgressIndicatorProps {
  value: number; // 0-100
  label?: string;
  showPercentage?: boolean;
  variant?: 'determinate' | 'indeterminate';
}

/**
 * ProgressIndicator component with WCAG 2.1 AA compliance (DA-004)
 * - Proper progressbar role with ARIA attributes
 * - Screen reader announcements via aria-live
 * - Descriptive labels and value text for assistive technology
 */
const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  value,
  label,
  showPercentage = true,
  variant = 'determinate',
}) => {
  // Create accessible label
  const ariaLabel = label || 'Loading progress';
  const ariaValueText = variant === 'indeterminate'
    ? 'Loading in progress'
    : `${value} percent complete`;

  return (
    <div
      className="progress-indicator"
      role="progressbar"
      aria-label={ariaLabel}
      aria-valuenow={variant === 'determinate' ? value : undefined}
      aria-valuemin={variant === 'determinate' ? 0 : undefined}
      aria-valuemax={variant === 'determinate' ? 100 : undefined}
      aria-valuetext={ariaValueText}
      aria-live="polite"
      aria-busy={variant === 'indeterminate' ? 'true' : 'false'}
    >
      {label && <div className="progress-label" aria-hidden="true">{label}</div>}
      <Progress
        value={variant === 'determinate' ? value : undefined}
        animation={variant === 'indeterminate'}
      />
      {showPercentage && variant === 'determinate' && (
        <div className="progress-percentage" aria-hidden="true">{value}%</div>
      )}
    </div>
  );
};

export default ProgressIndicator;
