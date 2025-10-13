import { ProgressBar } from '@progress/kendo-react-progressbars';
// ProgressIndicator.tsx - Progress bar for long operations
import type React from 'react';
import './ProgressIndicator.css';

interface ProgressIndicatorProps {
  value: number; // 0-100
  label?: string;
  showPercentage?: boolean;
  variant?: 'determinate' | 'indeterminate';
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  value,
  label,
  showPercentage = true,
  variant = 'determinate',
}) => {
  return (
    <div className="progress-indicator">
      {label && <div className="progress-label">{label}</div>}
      <ProgressBar
        value={variant === 'determinate' ? value : undefined}
        animation={variant === 'indeterminate'}
      />
      {showPercentage && variant === 'determinate' && (
        <div className="progress-percentage">{value}%</div>
      )}
    </div>
  );
};

export default ProgressIndicator;
