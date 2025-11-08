import { Stack, Tooltip, UnstyledButton } from '@mantine/core';
import {
  IconLayoutDashboard,
  IconUsers,
  IconPlug,
  IconChecklist,
  IconShield,
  IconFileText,
  IconActivity,
  IconSettings,
  IconInfoCircle,
  IconLogout,
} from '@tabler/icons-react';
import type React from 'react';
import classes from './AdminSidebar.module.css';

export interface MenuItem {
  text: string;
  iconComponent?: React.ComponentType<{ size?: number; className?: string; stroke?: number }>;
  route?: string;
  action?: () => void;
}

interface NavbarLinkProps {
  icon: React.ComponentType<{ size?: number; stroke?: number }>;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

function NavbarLink({ icon: Icon, label, active, onClick }: NavbarLinkProps) {
  return (
    <Tooltip label={label} position="right" transitionProps={{ duration: 0 }}>
      <UnstyledButton onClick={onClick} className={classes.link} data-active={active || undefined}>
        <Icon size={20} stroke={1.5} />
      </UnstyledButton>
    </Tooltip>
  );
}

interface AdminSidebarProps {
  expanded: boolean;
  onSelect: (item: MenuItem) => void;
  selectedItem: string;
  onLogout: () => void;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({ expanded, onSelect, selectedItem, onLogout }) => {
  const mainLinks = [
    { icon: IconLayoutDashboard, label: 'Dashboard', route: 'dashboard' },
    { icon: IconUsers, label: 'Members', route: 'members' },
    { icon: IconPlug, label: 'Endpoints', route: 'endpoints' },
    { icon: IconChecklist, label: 'Tasks', route: 'tasks' },
  ];

  const bottomLinks = [
    { icon: IconShield, label: 'User Management', route: 'settings' },
    { icon: IconFileText, label: 'Audit Logs', route: 'audit' },
    { icon: IconActivity, label: 'Health Monitor', route: 'health' },
    { icon: IconSettings, label: 'Settings', route: 'docs' },
    { icon: IconInfoCircle, label: 'About', route: 'about' },
  ];

  const links = mainLinks.map((link) => (
    <NavbarLink
      {...link}
      key={link.route}
      active={link.route === selectedItem}
      onClick={() => onSelect({ text: link.label, iconComponent: link.icon, route: link.route })}
    />
  ));

  const bottomLinkElements = bottomLinks.map((link) => (
    <NavbarLink
      {...link}
      key={link.route}
      active={link.route === selectedItem}
      onClick={() => onSelect({ text: link.label, iconComponent: link.icon, route: link.route })}
    />
  ));

  return (
    <nav className={classes.navbar}>
      <div className={classes.navbarMain}>
        <Stack justify="center" align="center" gap={0}>
          {links}
        </Stack>
      </div>

      <div className={classes.navbarBottom}>
        <Stack justify="center" align="center" gap={0}>
          {bottomLinkElements}
          <NavbarLink
            icon={IconLogout}
            label="Sign out"
            onClick={onLogout}
          />
        </Stack>
      </div>
    </nav>
  );
};

export default AdminSidebar;
