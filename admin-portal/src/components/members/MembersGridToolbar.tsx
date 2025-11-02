import { Button, Menu, TextInput } from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

interface MembersGridToolbarProps {
  query: string;
  onQueryChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onExcelExport: () => void;
  onCSVExport: () => void;
  onPDFExport: () => void;
  total: number;
  filteredCount: number;
  page: number;
  pageSize: number;
}

export const MembersGridToolbar: React.FC<MembersGridToolbarProps> = ({
  query,
  onQueryChange,
  onExcelExport,
  onCSVExport,
  onPDFExport,
  total,
  filteredCount,
  page,
  pageSize,
}) => {
  const { t } = useTranslation();

  return (
    <div className="grid-toolbar">
      <div className="toolbar-left">
        {/* Search Input */}
        <TextInput
          placeholder="Search members..."
          leftSection={<IconSearch size={16} />}
          value={query}
          onChange={onQueryChange}
          style={{ minWidth: '250px' }}
        />

        {/* Export Menu */}
        <Menu>
          <Menu.Target>
            <Button variant="outline" size="sm">
              {t('common.export', 'Export')}
            </Button>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item onClick={onExcelExport}>
              Export to Excel (.xlsx)
            </Menu.Item>
            <Menu.Item onClick={onCSVExport}>
              Export to CSV
            </Menu.Item>
            <Menu.Item onClick={onPDFExport}>
              Export to PDF
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </div>

      {/* Toolbar Stats */}
      <div className="toolbar-stats">
        <span>Total: {total}</span>
        <span>Showing: {filteredCount}</span>
        <span>Page {page} of {Math.ceil(filteredCount / pageSize)}</span>
      </div>
    </div>
  );
};
