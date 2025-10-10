// NotificationContext.tsx - Global notification system
import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import {
  Notification,
  NotificationGroup,
} from '@progress/kendo-react-notification';
import { Fade } from '@progress/kendo-react-animation';

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

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [notifications, setNotifications] = useState<NotificationMessage[]>([]);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const showNotification = useCallback(
    (
      type: NotificationType,
      message: string,
      title?: string,
      duration: number = 5000
    ) => {
      const id = `notification-${Date.now()}-${Math.random()}`;
      const notification: NotificationMessage = {
        id,
        type,
        message,
        title,
        duration,
      };

      setNotifications((prev) => [...prev, notification]);

      if (duration > 0) {
        setTimeout(() => {
          removeNotification(id);
        }, duration);
      }
    },
    [removeNotification]
  );

  const showSuccess = useCallback(
    (message: string, title: string = 'Success') => {
      showNotification('success', message, title);
    },
    [showNotification]
  );

  const showError = useCallback(
    (message: string, title: string = 'Error') => {
      showNotification('error', message, title, 7000); // Longer for errors
    },
    [showNotification]
  );

  const showWarning = useCallback(
    (message: string, title: string = 'Warning') => {
      showNotification('warning', message, title);
    },
    [showNotification]
  );

  const showInfo = useCallback(
    (message: string, title: string = 'Info') => {
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

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <NotificationGroup
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 10000,
          alignItems: 'flex-end',
        }}
      >
        {notifications.map((notification) => (
          <Fade key={notification.id} enter={true} exit={true}>
            <Notification
              type={{ style: notification.type, icon: true }}
              closable={true}
              onClose={() => removeNotification(notification.id)}
              style={{
                minWidth: '300px',
                maxWidth: '500px',
                marginBottom: '10px',
              }}
            >
              <div>
                {notification.title && (
                  <strong style={{ display: 'block', marginBottom: '5px' }}>
                    {notification.title}
                  </strong>
                )}
                <span>{notification.message}</span>
              </div>
            </Notification>
          </Fade>
        ))}
      </NotificationGroup>
    </NotificationContext.Provider>
  );
};
