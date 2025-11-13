import { Alert } from '@mantine/core';
import { AlertTriangle } from './icons';

interface ErrorAlertProps {
  error: Error | string | null;
  onClose?: () => void;
  title?: string;
}

/**
 * ErrorAlert - Standardized error display component
 *
 * Provides consistent error messaging across the application using
 * Mantine's Alert component with proper styling and accessibility.
 *
 * @example
 * ```tsx
 * const [error, setError] = useState<Error | null>(null);
 *
 * return (
 *   <>
 *     <ErrorAlert error={error} onClose={() => setError(null)} />
 *     {/* Component content *\/}
 *   </>
 * );
 * ```
 *
 * Part of Phase 4.2: Standardize Error Handling
 */
export function ErrorAlert({ error, onClose, title = 'Error' }: ErrorAlertProps) {
  if (!error) return null;

  const message = error instanceof Error ? error.message : error;

  return (
    <Alert
      icon={<AlertTriangle size={16} />}
      title={title}
      color="red"
      onClose={onClose}
      withCloseButton={!!onClose}
      mb="md"
    >
      {message}
    </Alert>
  );
}
