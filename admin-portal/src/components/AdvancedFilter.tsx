/**
 * Advanced Filter Component for Members Grid
 * Provides multi-criteria filtering with AND/OR logic
 */

import { Button, TextInput, Select } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';


import type React from 'react';
import { useState } from 'react';
import './AdvancedFilter.css';

export interface FilterCriteria {
  id: string;
  field: string;
  operator: string;
  value: string | Date | null;
}

// Composite filter descriptor for advanced filtering
export interface CompositeFilterDescriptor {
  logic: 'and' | 'or';
  filters: Array<{
    field: string;
    operator: string;
    value: string | Date | null;
  }>;
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
        <DatePickerInput
          value={criterion.value ? new Date(criterion.value) : null}
          onChange={(value) => updateCriteria(criterion.id, { value })}
          valueFormat="YYYY-MM-DD"
        />
      );
    }

    if (fieldType === 'select') {
      const options = criterion.field === 'status' ? statusOptions : membershipOptions;
      return (
        <Select
          data={options}
          value={(criterion.value as string) || null}
          onChange={(value) => updateCriteria(criterion.id, { value: value || '' })}
        />
      );
    }

    return (
      <TextInput
        value={(criterion.value as string) || ''}
        onChange={(value) => updateCriteria(criterion.id, { value: String(value || '') })}
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
          <Select
            data={['and', 'or']}
            value={logic}
            onChange={(value) => setLogic((value as 'and' | 'or') || 'and')}
            style={{ width: '100px' }}
          />
        </div>
      </div>

      <div className="filter-criteria-list">
        {criteria.map((criterion, index) => (
          <div key={criterion.id} className="filter-criterion">
            <span className="criterion-index">{index + 1}</span>

            <Select
              data={fields}
              value={criterion.field}
              onChange={(value) => {
                if (value) {
                  updateCriteria(criterion.id, {
                    field: value,
                    operator: getOperators(value)[0].value,
                    value: '',
                  });
                }
              }}
              style={{ width: '180px' }}
            />

            <Select
              data={getOperators(criterion.field)}
              value={criterion.operator}
              onChange={(value) => updateCriteria(criterion.id, { operator: value || '' })}
              style={{ width: '150px' }}
            />

            <div style={{ flex: 1, minWidth: '200px' }}>{renderValueInput(criterion)}</div>

            {criteria.length > 1 && (
              <Button
                leftSection="delete"
                variant="subtle"
                onClick={() => removeCriteria(criterion.id)}
                title="Remove criterion"
              />
            )}
          </div>
        ))}
      </div>

      <div className="filter-actions">
        <Button leftSection="plus" onClick={addCriteria} variant="outline">
          Add Criterion
        </Button>
        <div className="filter-buttons">
          <Button onClick={handleClear}>Clear</Button>
          <Button color="blue" onClick={handleApply}>
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
