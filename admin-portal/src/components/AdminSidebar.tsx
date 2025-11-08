import { Center, Stack, Tooltip, UnstyledButton } from '@mantine/core';
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
import classes from './AdminSidebar.module.css';

export interface MenuItem {
  text: string;
  iconComponent?: React.ComponentType<{ size?: number; className?: string }>;
  route?: string;
}

interface NavbarLinkProps {
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

function NavbarLink({ icon: Icon, label, active, onClick }: NavbarLinkProps) {
  return (
    <Tooltip label={label} position="right" transitionProps={{ duration: 0 }}>
      <UnstyledButton onClick={onClick} className={classes.link} data-active={active || undefined}>
        <Icon size={20} />
      </UnstyledButton>
    </Tooltip>
  );
}

interface AdminSidebarProps {
  expanded: boolean;
  onSelect: (item: MenuItem) => void;
  selectedItem: string;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({ expanded, onSelect, selectedItem }) => {
  const mainLinks = [
    { icon: LayoutDashboard, label: 'Dashboard', route: 'dashboard' },
    { icon: Users, label: 'Members', route: 'members' },
    { icon: Plug, label: 'Endpoints', route: 'endpoints' },
    { icon: CheckSquare, label: 'Tasks', route: 'tasks' },
  ];

  const bottomLinks = [
    { icon: Shield, label: 'User Management', route: 'settings' },
    { icon: FileText, label: 'Audit Logs', route: 'audit' },
    { icon: Activity, label: 'Health Monitor', route: 'health' },
    { icon: Settings, label: 'Settings', route: 'docs' },
    { icon: Info, label: 'About', route: 'about' },
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
      <Center>
        <img src="/assets/logos/ctn.png" alt="CTN" style={{ width: 40, height: 40 }} />
      </Center>

      <div className={classes.navbarMain}>
        <Stack justify="center" gap={0}>
          {links}
        </Stack>
      </div>

      <Stack justify="center" gap={0}>
        {bottomLinkElements}
      </Stack>
    </nav>
  );
};

export default AdminSidebar;
