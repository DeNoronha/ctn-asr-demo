import React, { useState, useEffect } from 'react';
import { Grid, GridColumn, GridToolbar } from '@progress/kendo-react-grid';
import { Input } from '@progress/kendo-react-inputs';
import { Button } from '@progress/kendo-react-buttons';
import { filterBy, orderBy, SortDescriptor, FilterDescriptor, CompositeFilterDescriptor } from '@progress/kendo-data-query';
import { Member } from '../services/api';
import './MembersGrid.css';

interface MembersGridProps {
  members: Member[];
  onIssueToken: (orgId: string) => void;
  loading?: boolean;
}

const MembersGrid: React.FC<MembersGridProps> = ({ members, onIssueToken, loading = false }) => {
  const [gridData, setGridData] = useState<Member[]>(members);
  const [sort, setSort] = useState<SortDescriptor[]>([]);
  const [filter, setFilter] = useState<CompositeFilterDescriptor>({
    logic: 'and',
    filters: []
  });
  const [searchValue, setSearchValue] = useState('');

  useEffect(() => {
    let data = [...members];
    
    // Apply filtering
    if (filter.filters.length > 0) {
      data = filterBy(data, filter);
    }
    
    // Apply sorting
    if (sort.length > 0) {
      data = orderBy(data, sort);
    }
    
    setGridData(data);
  }, [members, filter, sort]);

  const handleSearchChange = (e: any) => {
    const value = e.target.value;
    setSearchValue(value);

    if (value) {
      setFilter({
        logic: 'or',
        filters: [
          { field: 'legal_name', operator: 'contains', value },
          { field: 'org_id', operator: 'contains', value },
          { field: 'domain', operator: 'contains', value },
          { field: 'lei', operator: 'contains', value },
          { field: 'kvk', operator: 'contains', value },
        ]
      });
    } else {
      setFilter({ logic: 'and', filters: [] });
    }
  };

  const StatusCell = (props: any) => {
    const getStatusColor = (status: string) => {
      switch (status) {
        case 'ACTIVE': return '#10b981';
        case 'PENDING': return '#f59e0b';
        case 'SUSPENDED': return '#ef4444';
        default: return '#6b7280';
      }
    };

    return (
      <td>
        <span
          className="status-badge"
          style={{ backgroundColor: getStatusColor(props.dataItem.status) }}
        >
          {props.dataItem.status}
        </span>
      </td>
    );
  };

  const MembershipCell = (props: any) => {
    const getMembershipColor = (level: string) => {
      switch (level) {
        case 'PREMIUM': return '#8b5cf6';
        case 'FULL': return '#3b82f6';
        case 'BASIC': return '#6b7280';
        default: return '#9ca3af';
      }
    };

    return (
      <td>
        <span
          className="membership-badge"
          style={{ backgroundColor: getMembershipColor(props.dataItem.membership_level) }}
        >
          {props.dataItem.membership_level}
        </span>
      </td>
    );
  };

  const DateCell = (props: any) => {
    return (
      <td>
        {new Date(props.dataItem[props.field || '']).toLocaleDateString()}
      </td>
    );
  };

  const ActionCell = (props: any) => {
    const isActive = props.dataItem.status === 'ACTIVE';
    
    return (
      <td>
        <Button
          themeColor="primary"
          size="small"
          disabled={!isActive}
          onClick={() => onIssueToken(props.dataItem.org_id)}
        >
          Issue Token
        </Button>
      </td>
    );
  };

  return (
    <div className="members-grid-container">
      <Grid
        data={gridData}
        sortable={true}
        sort={sort}
        onSortChange={(e) => setSort(e.sort)}
        pageable={true}
        pageSize={10}
        style={{ height: '600px' }}
      >
        <GridToolbar>
          <div className="grid-toolbar">
            <Input
              value={searchValue}
              onChange={handleSearchChange}
              placeholder="Search members..."
              style={{ width: '300px' }}
            />
            <div className="toolbar-stats">
              <span>Total Members: {members.length}</span>
              <span>Showing: {gridData.length}</span>
            </div>
          </div>
        </GridToolbar>
        
        <GridColumn field="legal_name" title="Legal Name" width="200px" />
        <GridColumn field="org_id" title="Organization ID" width="180px" />
        <GridColumn field="domain" title="Domain" width="150px" />
        <GridColumn field="status" title="Status" width="120px" cell={StatusCell} />
        <GridColumn 
          field="membership_level" 
          title="Membership" 
          width="120px" 
          cell={MembershipCell} 
        />
        <GridColumn field="lei" title="LEI" width="150px" />
        <GridColumn field="kvk" title="KVK" width="120px" />
        <GridColumn 
          field="created_at" 
          title="Joined" 
          width="120px" 
          cell={DateCell}
        />
        <GridColumn 
          title="Actions" 
          width="120px" 
          cell={ActionCell}
          sortable={false}
        />
      </Grid>
    </div>
  );
};

export default MembersGrid;
