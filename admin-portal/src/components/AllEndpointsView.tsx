/**
 * All Endpoints View - Grid showing all endpoints from all members
 */

import React, { useEffect, useState } from 'react';
import { Badge, Button, Group, Stack, Text, TextInput } from '@mantine/core';
import { DataTable } from 'mantine-datatable';
import { IconSearch, IconPlug, IconRefresh } from '@tabler/icons-react';
import { EmptyState } from './EmptyState';
import { RoleGuard } from '../auth/ProtectedRoute';
import { UserRole } from '../auth/authConfig';
import { useNotification } from '../contexts/NotificationContext';
import { useApiError } from '../hooks/useApiError';
import { apiV2 } from '../services/apiV2';
import { logger } from '../utils/logger';
import { formatDateTime } from '../utils/dateFormat';
import { defaultDataTableProps, defaultPaginationOptions } from './shared/DataTableConfig';
import { PAGINATION } from '../config/constants';
import './EndpointManagement.css';

interface EndpointWithMember {
  legal_entity_endpoint_id: string;
  legal_entity_id: string;
  legal_entity_name: string;
  endpoint_name: string;
  endpoint_url: string;
  data_category: string;
  endpoint_type: string;
  is_active: boolean;
  dt_created: string;
}

export const AllEndpointsView: React.FC = () => {
  const [endpoints, setEndpoints] = useState<EndpointWithMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState<number>(PAGINATION.DEFAULT_PAGE);
  const pageSize = PAGINATION.DEFAULT_PAGE_SIZE;
  const notification = useNotification();
  const { handleError } = useApiError();

  const loadAllEndpoints = async () => {
    setLoading(true);
    try {
      // Get all members first
      const membersResponse = await apiV2.getMembers();
      const members = membersResponse.data || [];

      // Load endpoints for each member
      const allEndpoints: EndpointWithMember[] = [];

      for (const member of members) {
        if (member.legal_entity_id) {
          try {
            const memberEndpoints = await apiV2.getEndpoints(member.legal_entity_id);

            // Add member info to each endpoint
            const endpointsWithMember = memberEndpoints.map(endpoint => ({
              legal_entity_endpoint_id: endpoint.legal_entity_endpoint_id || '',
              legal_entity_id: member.legal_entity_id!,
              legal_entity_name: member.legal_name || '',
              endpoint_name: endpoint.endpoint_name,
              endpoint_url: endpoint.endpoint_url || '',
              data_category: endpoint.data_category || '',
              endpoint_type: endpoint.endpoint_type || 'REST_API',
              is_active: endpoint.is_active ?? false,
              dt_created: endpoint.dt_created || new Date().toISOString(),
            }));

            allEndpoints.push(...endpointsWithMember);
          } catch (error) {
            // Log but don't fail if one member's endpoints fail to load
            logger.error(`Failed to load endpoints for ${member.legal_name}:`, error);
          }
        }
      }

      setEndpoints(allEndpoints);
    } catch (error) {
      logger.error('Failed to load endpoints:', error);
      notification.showError('Failed to load endpoints');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllEndpoints();
  }, []);

  // Filter endpoints based on search query
  const filteredEndpoints = endpoints.filter(endpoint =>
    endpoint.endpoint_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    endpoint.legal_entity_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    endpoint.endpoint_url.toLowerCase().includes(searchQuery.toLowerCase()) ||
    endpoint.data_category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Paginate filtered results
  const paginatedEndpoints = filteredEndpoints.slice((page - 1) * pageSize, page * pageSize);

  const getDataCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      CONTAINER: 'blue',
      CUSTOMS: 'grape',
      WAREHOUSE: 'orange',
      TRANSPORT: 'teal',
      FINANCIAL: 'green',
      GENERAL: 'gray',
    };
    return colors[category] || 'gray';
  };

  return (
    <div className="endpoints-view">
      <h1>All Endpoints</h1>

      <Stack gap="md">
        <Group justify="space-between">
          <TextInput
            placeholder="Search by name, member, URL, or category..."
            leftSection={<IconSearch size={16} />}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1); // Reset to first page on search
            }}
            style={{ width: '400px' }}
          />

          <Button
            leftSection={<IconRefresh size={16} />}
            onClick={loadAllEndpoints}
            loading={loading}
            variant="light"
          >
            Refresh
          </Button>
        </Group>

        {endpoints.length === 0 && !loading ? (
          <EmptyState
            icon={<IconPlug size={48} />}
            message="No endpoints registered"
            hint="There are no system integration endpoints registered yet. Endpoints can be added from the member detail pages."
          />
        ) : (
          <DataTable
            {...defaultDataTableProps}
            columns={[
              {
                accessor: 'legal_entity_name',
                title: 'Organization',
                sortable: true,
                width: 200,
              },
              {
                accessor: 'endpoint_name',
                title: 'Endpoint Name',
                sortable: true,
                width: 180,
              },
              {
                accessor: 'endpoint_url',
                title: 'URL',
                sortable: true,
                render: (endpoint) => (
                  <Text size="sm" c="dimmed" style={{ fontFamily: 'monospace', fontSize: '11px' }}>
                    {endpoint.endpoint_url}
                  </Text>
                ),
              },
              {
                accessor: 'data_category',
                title: 'Category',
                sortable: true,
                width: 140,
                render: (endpoint) => (
                  <Badge color={getDataCategoryColor(endpoint.data_category)} size="sm">
                    {endpoint.data_category}
                  </Badge>
                ),
              },
              {
                accessor: 'endpoint_type',
                title: 'Type',
                sortable: true,
                width: 120,
                render: (endpoint) => (
                  <Badge color="gray" size="sm" variant="outline">
                    {endpoint.endpoint_type}
                  </Badge>
                ),
              },
              {
                accessor: 'is_active',
                title: 'Status',
                sortable: true,
                width: 100,
                render: (endpoint) => (
                  <Badge color={endpoint.is_active ? 'green' : 'red'} size="sm">
                    {endpoint.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                ),
              },
              {
                accessor: 'dt_created',
                title: 'Created',
                sortable: true,
                width: 150,
                render: (endpoint) => formatDateTime(endpoint.dt_created),
              },
            ]}
            records={paginatedEndpoints}
            totalRecords={filteredEndpoints.length}
            recordsPerPage={pageSize}
            page={page}
            onPageChange={setPage}
            paginationSize="sm"
            paginationActiveBackgroundColor="blue"
            fetching={loading}
            noRecordsText="No endpoints found"
          />
        )}

        {filteredEndpoints.length > 0 && (
          <Text size="sm" c="dimmed">
            Showing {paginatedEndpoints.length} of {filteredEndpoints.length} endpoint{filteredEndpoints.length !== 1 ? 's' : ''}
            {searchQuery && ` matching "${searchQuery}"`}
          </Text>
        )}
      </Stack>
    </div>
  );
};
