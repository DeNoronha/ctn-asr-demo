import React from 'react';
import { Drawer, DrawerContent } from '@progress/kendo-react-layout';
import './AdminSidebar.css';

export interface MenuItem {
  text: string;
  icon?: string;
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
    { text: 'Dashboard', icon: '📊', route: 'dashboard' },
    { text: 'Members', icon: '👥', route: 'members' },
    { text: 'Token Management', icon: '🔑', route: 'tokens' },
    { separator: true, text: '' },
    { text: 'Settings', icon: '⚙️', route: 'settings' },
    { text: 'Documentation', icon: '📚', route: 'docs' },
  ];

  return (
    <Drawer
      expanded={expanded}
      mode="push"
      mini={true}
      items={items.map((item) => ({
        ...item,
        selected: item.route === selectedItem,
      }))}
      onSelect={(e) => onSelect(e.itemTarget)}
      className="admin-drawer"
    >
      <DrawerContent>
        {/* Content will be rendered by parent component */}
      </DrawerContent>
    </Drawer>
  );
};

export default AdminSidebar;
