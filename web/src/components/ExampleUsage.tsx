import { Button } from '@progress/kendo-react-buttons';
// ExampleUsage.tsx - Demo of all loading & feedback features
import type React from 'react';
import { useState } from 'react';
import { useNotification } from '../contexts/NotificationContext';
import { useAsync } from '../hooks/useAsync';
import LoadingSpinner from './LoadingSpinner';
import ProgressIndicator from './ProgressIndicator';

const ExampleUsage: React.FC = () => {
  const notification = useNotification();
  const [progress, setProgress] = useState(0);

  // Example 1: Simple async operation
  const { loading: simpleLoading, execute: executeSimple } = useAsync({
    showSuccessNotification: true,
    successMessage: 'Operation completed successfully!',
  });

  const handleSimpleOperation = () => {
    executeSimple(async () => {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return { success: true };
    });
  };

  // Example 2: Operation with progress
  const handleProgressOperation = async () => {
    setProgress(0);
    notification.showInfo('Starting long operation...', 'Processing');

    for (let i = 0; i <= 100; i += 10) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      setProgress(i);
    }

    notification.showSuccess('Long operation completed!');
    setProgress(0);
  };

  // Example 3: Different notification types
  const showNotifications = () => {
    notification.showSuccess('This is a success message!');
    setTimeout(() => notification.showInfo('This is an info message!'), 500);
    setTimeout(() => notification.showWarning('This is a warning message!'), 1000);
    setTimeout(() => notification.showError('This is an error message!'), 1500);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px' }}>
      <h2>Loading & Feedback Examples</h2>

      {/* Example 1: Simple Loading */}
      <div style={{ marginBottom: '30px' }}>
        <h3>1. Simple Async Operation</h3>
        <Button onClick={handleSimpleOperation} disabled={simpleLoading}>
          {simpleLoading ? 'Loading...' : 'Start Simple Operation'}
        </Button>
        {simpleLoading && <LoadingSpinner size="small" message="Processing..." />}
      </div>

      {/* Example 2: Progress Indicator */}
      <div style={{ marginBottom: '30px' }}>
        <h3>2. Long Operation with Progress</h3>
        <Button onClick={handleProgressOperation} disabled={progress > 0}>
          Start Long Operation
        </Button>
        {progress > 0 && (
          <ProgressIndicator value={progress} label="Processing data..." showPercentage={true} />
        )}
      </div>

      {/* Example 3: All Notification Types */}
      <div style={{ marginBottom: '30px' }}>
        <h3>3. Notification Types</h3>
        <Button onClick={showNotifications}>Show All Notifications</Button>
      </div>

      {/* Example 4: Loading States */}
      <div style={{ marginBottom: '30px' }}>
        <h3>4. Loading Spinner Variants</h3>
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          <div>
            <p>Small:</p>
            <LoadingSpinner size="small" />
          </div>
          <div>
            <p>Medium:</p>
            <LoadingSpinner size="medium" />
          </div>
          <div>
            <p>Large:</p>
            <LoadingSpinner size="large" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExampleUsage;
