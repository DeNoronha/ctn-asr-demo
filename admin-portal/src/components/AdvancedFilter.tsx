/**
 * Advanced Filter Component for Members Grid
 * Provides multi-criteria filtering with AND/OR logic
 */

import type { CompositeFilterDescriptor } from '@progress/kendo-data-query';
import { Button } from '@progress/kendo-react-buttons';
import { DatePicker } from '@progress/kendo-react-dateinputs';
import { DropDownList } from '@progress/kendo-react-dropdowns';
import { Input } from '@progress/kendo-react-inputs';
import type React from 'react';
import { useState } from 'react';
import './AdvancedFilter.css';

export interface FilterCriteria {
  id: string;
  field: string;
  operator: string;
  value: string | Date | null;
}

interface AdvancedFilterProps {
  onApply: (filter: CompositeFilterDescriptor) => void;
  onClear: () => void;
}

const fields = [
  { value: 'legal_name', label: 'Legal Name' },
  { value: 'org_id', label: 'Organization ID' },
  { value: 'domain', label: 'Domain' },
  { value: 'status', label: 'Status' },
  { value: 'membership_level', label: 'Membership Level' },
  { value: 'lei', label: 'LEI' },
  { value: 'kvk', label: 'KvK' },
  { value: 'created_at', label: 'Created Date' },
];

const operators = {
  text: [
    { value: 'contains', label: 'Contains' },
    { value: 'eq', label: 'Equals' },
    { value: 'startswith', label: 'Starts with' },
    { value: 'endswith', label: 'Ends with' },
    { value: 'doesnotcontain', label: 'Does not contain' },
  ],
  date: [
    { value: 'eq', label: 'Equals' },
    { value: 'gte', label: 'On or after' },
    { value: 'lte', label: 'On or before' },
  ],
  select: [
    { value: 'eq', label: 'Equals' },
    { value: 'neq', label: 'Not equals' },
  ],
};

const statusOptions = ['ACTIVE', 'PENDING', 'SUSPENDED', 'TERMINATED'];
const membershipOptions = ['BASIC', 'FULL', 'PREMIUM'];

const AdvancedFilter: React.FC<AdvancedFilterProps> = ({ onApply, onClear }) => {
  const [criteria, setCriteria] = useState<FilterCriteria[]>([
    { id: '1', field: 'legal_name', operator: 'contains', value: '' },
  ]);
  const [logic, setLogic] = useState<'and' | 'or'>('and');

  const addCriteria = () => {
    setCriteria([
      ...criteria,
      { id: Date.now().toString(), field: 'legal_name', operator: 'contains', value: '' },
    ]);
  };

  const removeCriteria = (id: string) => {
    setCriteria(criteria.filter((c) => c.id !== id));
  };

  const updateCriteria = (id: string, updates: Partial<FilterCriteria>) => {
    setCriteria(criteria.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  };

  const getOperators = (field: string) => {
    if (field === 'created_at') return operators.date;
    if (field === 'status' || field === 'membership_level') return operators.select;
    return operators.text;
  };

  const getFieldType = (field: string) => {
    if (field === 'created_at') return 'date';
    if (field === 'status' || field === 'membership_level') return 'select';
    return 'text';
  };

  const renderValueInput = (criterion: FilterCriteria) => {
    const fieldType = getFieldType(criterion.field);

    if (fieldType === 'date') {
      return (
        <DatePicker
          value={criterion.value ? new Date(criterion.value) : null}
          onChange={(e) => updateCriteria(criterion.id, { value: e.value })}
          format="yyyy-MM-dd"
        />
      );
    }

    if (fieldType === 'select') {
      const options = criterion.field === 'status' ? statusOptions : membershipOptions;
      return (
        <DropDownList
          data={options}
          value={criterion.value}
          onChange={(e) => updateCriteria(criterion.id, { value: e.value })}
        />
      );
    }

    return (
      <Input
        value={(criterion.value as string) || ''}
        onChange={(e) => updateCriteria(criterion.id, { value: String(e.target.value || '') })}
        placeholder="Enter value..."
      />
    );
  };

  const handleApply = () => {
    // Build composite filter from criteria
    const filters = criteria
      .filter((c) => c.value !== '' && c.value !== null)
      .map((c) => ({
        field: c.field,
        operator: c.operator,
        value: c.value,
      }));

    if (filters.length === 0) {
      onClear();
      return;
    }

    const compositeFilter: CompositeFilterDescriptor = {
      logic: logic,
      filters: filters,
    };

    onApply(compositeFilter);
  };

  const handleClear = () => {
    setCriteria([{ id: '1', field: 'legal_name', operator: 'contains', value: '' }]);
    setLogic('and');
    onClear();
  };

  return (
    <div className="advanced-filter">
      <div className="filter-header">
        <h3>Advanced Filters</h3>
        <div className="logic-selector">
          <label>Match: </label>
          <DropDownList
            data={['and', 'or']}
            value={logic}
            onChange={(e) => setLogic(e.value)}
            style={{ width: '100px' }}
          />
        </div>
      </div>

      <div className="filter-criteria-list">
        {criteria.map((criterion, index) => (
          <div key={criterion.id} className="filter-criterion">
            <span className="criterion-index">{index + 1}</span>

            <DropDownList
              data={fields}
              textField="label"
              dataItemKey="value"
              value={fields.find((f) => f.value === criterion.field)}
              onChange={(e) => {
                updateCriteria(criterion.id, {
                  field: e.value.value,
                  operator: getOperators(e.value.value)[0].value,
                  value: '',
                });
              }}
              style={{ width: '180px' }}
            />

            <DropDownList
              data={getOperators(criterion.field)}
              textField="label"
              dataItemKey="value"
              value={getOperators(criterion.field).find((o) => o.value === criterion.operator)}
              onChange={(e) => updateCriteria(criterion.id, { operator: e.value.value })}
              style={{ width: '150px' }}
            />

            <div style={{ flex: 1, minWidth: '200px' }}>{renderValueInput(criterion)}</div>

            {criteria.length > 1 && (
              <Button
                icon="delete"
                fillMode="flat"
                onClick={() => removeCriteria(criterion.id)}
                title="Remove criterion"
              />
            )}
          </div>
        ))}
      </div>

      <div className="filter-actions">
        <Button icon="plus" onClick={addCriteria} fillMode="outline">
          Add Criterion
        </Button>
        <div className="filter-buttons">
          <Button onClick={handleClear}>Clear</Button>
          <Button themeColor="primary" onClick={handleApply}>
            Apply Filters
          </Button>
        </div>
      </div>

      <div className="filter-summary">
        {criteria.filter((c) => c.value).length > 0 && (
          <p>
            <strong>Active Filters:</strong> {criteria.filter((c) => c.value).length} criterion
            {criteria.filter((c) => c.value).length > 1 && ` (${logic.toUpperCase()} logic)`}
          </p>
        )}
      </div>
    </div>
  );
};

export default AdvancedFilter;
