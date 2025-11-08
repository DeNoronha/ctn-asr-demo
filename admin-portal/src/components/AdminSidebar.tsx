import { NavLink, Stack, Divider } from '@mantine/core';
import {
  Activity,
  CheckSquare,
  FileText,
  Info,
  LayoutDashboard,
  Plug,
  Settings,
  Shield,
  Users,
} from './icons';
import type React from 'react';

export interface MenuItem {
  text: string;
  iconComponent?: React.ComponentType<{ size?: number; className?: string }>;
  route?: string;
  separator?: boolean;
}

interface AdminSidebarProps {
  expanded: boolean;
  onSelect: (item: MenuItem) => void;
  selectedItem: string;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({ expanded, onSelect, selectedItem }) => {
  const items: MenuItem[] = [
    { text: 'Dashboard', iconComponent: LayoutDashboard, route: 'dashboard' },
    { text: 'Members', iconComponent: Users, route: 'members' },
    { text: 'Endpoints', iconComponent: Plug, route: 'endpoints' },
    { text: 'Tasks', iconComponent: CheckSquare, route: 'tasks' },
    { separator: true, text: '' },
    { text: 'User Management', iconComponent: Shield, route: 'settings' },
    { text: 'Audit Logs', iconComponent: FileText, route: 'audit' },
    { text: 'Health Monitor', iconComponent: Activity, route: 'health' },
    { text: 'Settings', iconComponent: Settings, route: 'docs' },
    { text: 'About', iconComponent: Info, route: 'about' },
  ];

  const handleItemClick = (item: MenuItem) => {
    if (!item.separator) {
      onSelect(item);
    }
  };

  return (
    <Stack gap="xs">
      {items.map((item, index) => {
        if (item.separator) {
          return <Divider key={index} my="sm" />;
        }

        const IconComponent = item.iconComponent;
        const isActive = item.route === selectedItem;

        return (
          <NavLink
            key={index}
            label={item.text}
            leftSection={IconComponent && <IconComponent size={20} />}
            active={isActive}
            onClick={() => handleItemClick(item)}
            variant="filled"
            style={{ borderRadius: 8 }}
          />
        );
      })}
    </Stack>
  );
};

export default AdminSidebar;
