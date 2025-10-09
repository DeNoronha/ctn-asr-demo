import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Key, 
  Shield, 
  FileText,
  BookOpen,
  Plug 
} from 'lucide-react';
import './AdminSidebar.css';

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
    { text: 'Token Management', iconComponent: Key, route: 'tokens' },
    { separator: true, text: '' },
    { text: 'User Management', iconComponent: Shield, route: 'settings' },
    { text: 'Audit Logs', iconComponent: FileText, route: 'audit' },
    { text: 'Documentation', iconComponent: BookOpen, route: 'docs' },
  ];

  const handleItemClick = (item: MenuItem) => {
    if (!item.separator) {
      onSelect(item);
    }
  };

  return (
    <div className={`admin-sidebar ${expanded ? '' : 'collapsed'}`}>
      <div className="sidebar-nav">
        {items.map((item, index) => {
          if (item.separator) {
            return <div key={index} className="drawer-item separator" />;
          }

          const IconComponent = item.iconComponent;
          const isSelected = item.route === selectedItem;

          return (
            <div
              key={index}
              className={`drawer-item ${isSelected ? 'selected' : ''}`}
              onClick={() => handleItemClick(item)}
            >
              {IconComponent && (
                <span className="item-icon">
                  <IconComponent size={20} />
                </span>
              )}
              <span className="item-text">{item.text}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AdminSidebar;
