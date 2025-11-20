import { Grid, Skeleton, Stack } from '@mantine/core';
import type React from 'react';

/**
 * DashboardSkeleton - Loading skeleton for Dashboard component
 *
 * Provides a skeleton UI that matches the Dashboard layout while data is loading.
 * Improves perceived performance by showing content structure immediately.
 */
export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="dashboard">
      <div className="page-header">
        <div>
          <Skeleton height={32} width={150} mb="xs" />
          <Skeleton height={20} width={350} />
        </div>
      </div>

      {/* Stats Grid Skeleton */}
      <div className="stats-grid">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="stat-card">
            <Skeleton height={20} width={120} mb="sm" />
            <Skeleton height={36} width={100} mb="xs" />
            <Skeleton height={16} width={150} />
          </div>
        ))}
      </div>

      {/* Card Grid Skeleton */}
      <div className="card-grid">
        <div className="card">
          <div className="card-header">
            <Skeleton height={24} width={200} />
          </div>
          <Stack gap="md" mt="md">
            {[...Array(4)].map((_, i) => (
              <Grid key={i} gutter="md">
                <Grid.Col span={6}>
                  <Skeleton height={16} width="80%" />
                </Grid.Col>
                <Grid.Col span={6}>
                  <Skeleton height={16} width="90%" />
                </Grid.Col>
              </Grid>
            ))}
          </Stack>
        </div>

        <div className="card">
          <div className="card-header">
            <Skeleton height={24} width={150} />
          </div>
          <Stack gap="xs" mt="md">
            <Skeleton height={60} />
          </Stack>
        </div>
      </div>

      {/* Recent Endpoints Skeleton */}
      <div className="card">
        <div className="card-header">
          <Skeleton height={24} width={180} />
        </div>
        <Stack gap="sm" mt="md">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="list-item">
              <div>
                <Skeleton height={18} width={200} mb="xs" />
                <Skeleton height={14} width={300} />
              </div>
              <Skeleton height={24} width={60} />
            </div>
          ))}
        </Stack>
      </div>
    </div>
  );
};
