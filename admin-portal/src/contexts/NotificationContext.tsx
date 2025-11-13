// NotificationContext.tsx - Global notification system
import { notifications } from '@mantine/notifications';
import type React from 'react';
import { createContext, useCallback, useContext, useMemo } from 'react';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface NotificationMessage {
  id: string;
  type: NotificationType;
  message: string;
  title?: string;
  duration?: number;
}

interface NotificationContextType {
  showNotification: (
    type: NotificationType,
    message: string,
    title?: string,
    duration?: number
  ) => void;
  showSuccess: (message: string, title?: string) => void;
  showError: (message: string, title?: string) => void;
  showWarning: (message: string, title?: string) => void;
  showInfo: (message: string, title?: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const showNotification = useCallback(
    (type: NotificationType, message: string, title?: string, duration = 5000) => {
      notifications.show({
        title: title || type.charAt(0).toUpperCase() + type.slice(1),
        message,
        color:
          type === 'error'
            ? 'red'
            : type === 'warning'
              ? 'yellow'
              : type === 'success'
                ? 'green'
                : 'blue',
        autoClose: duration,
        withCloseButton: true,
      });
    },
    []
  );

  const showSuccess = useCallback(
    (message: string, title = 'Success') => {
      showNotification('success', message, title);
    },
    [showNotification]
  );

  const showError = useCallback(
    (message: string, title = 'Error') => {
      showNotification('error', message, title, 7000); // Longer for errors
    },
    [showNotification]
  );

  const showWarning = useCallback(
    (message: string, title = 'Warning') => {
      showNotification('warning', message, title);
    },
    [showNotification]
  );

  const showInfo = useCallback(
    (message: string, title = 'Info') => {
      showNotification('info', message, title);
    },
    [showNotification]
  );

  const value: NotificationContextType = useMemo(
    () => ({
      showNotification,
      showSuccess,
      showError,
      showWarning,
      showInfo,
    }),
    [showNotification, showSuccess, showError, showWarning, showInfo]
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};
