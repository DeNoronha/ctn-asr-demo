import { LoadingOverlay } from '@mantine/core';
import type React from 'react';

interface LoadingStateProps {
  /** Whether the loading overlay should be visible */
  loading: boolean;
  /** Minimum height of the container (prevents layout shift) */
  minHeight?: number | string;
  /** Children to render (content that will be covered by overlay) */
  children: React.ReactNode;
  /** Optional blur effect radius */
  blur?: number;
  /** Custom z-index for overlay */
  zIndex?: number;
}

/**
 * LoadingState - Standardized loading overlay component
 *
 * Wraps content in a container with Mantine's LoadingOverlay.
 * Provides consistent loading indicators across the application
 * with proper accessibility and positioning.
 *
 * @example
 * ```tsx
 * function MyDataView() {
 *   const [loading, setLoading] = useState(false);
 *   const [data, setData] = useState([]);
 *
 *   useEffect(() => {
 *     const fetchData = async () => {
 *       setLoading(true);
 *       try {
 *         const result = await apiClient.member.getData();
 *         setData(result);
 *       } finally {
 *         setLoading(false);
 *       }
 *     };
 *     fetchData();
 *   }, []);
 *
 *   return (
 *     <LoadingState loading={loading} minHeight={400}>
 *       <DataTable records={data} columns={columns} />
 *     </LoadingState>
 *   );
 * }
 * ```
 *
 * Part of Phase 4.2: Standardize Loading States
 */
export function LoadingState({
  loading,
  minHeight = 200,
  children,
  blur = 2,
  zIndex = 1000,
}: LoadingStateProps) {
  return (
    <div style={{ position: 'relative', minHeight }}>
      <LoadingOverlay
        visible={loading}
        zIndex={zIndex}
        overlayProps={{ radius: 'sm', blur }}
        loaderProps={{ type: 'dots' }}
      />
      {children}
    </div>
  );
}
