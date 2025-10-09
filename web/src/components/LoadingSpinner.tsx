// LoadingSpinner.tsx - Reusable loading component
import React from 'react';
import { Loader, LoaderSize } from '@progress/kendo-react-indicators';
import './LoadingSpinner.css';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  message?: string;
  fullScreen?: boolean;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium',
  message,
  fullScreen = false,
}) => {
  const sizeMap: Record<string, LoaderSize> = {
    small: 'small',
    medium: 'medium',
    large: 'large',
  };

  const content = (
    <div className={`loading-spinner-content ${fullScreen ? 'fullscreen' : ''}`}>
      <Loader size={sizeMap[size]} type="infinite-spinner" />
      {message && <div className="loading-message">{message}</div>}
    </div>
  );

  if (fullScreen) {
    return <div className="loading-spinner-overlay">{content}</div>;
  }

  return content;
};

export default LoadingSpinner;
