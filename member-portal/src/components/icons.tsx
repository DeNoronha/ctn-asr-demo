/**
 * Icon Components - Replacement for lucide-react
 * Using Kendo UI icons and simple HTML/Unicode icons
 */

import React from 'react';

interface IconProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

// Simple icon wrapper component
const Icon: React.FC<IconProps & { icon: string; label?: string }> = ({
  size = 24,
  className = '',
  style = {},
  icon,
  label,
}) => (
  <span
    className={`icon ${className}`}
    style={{ fontSize: size, display: 'inline-block', lineHeight: 1, ...style }}
    role="img"
    aria-label={label || 'icon'}
  >
    {icon}
  </span>
);

// Icon exports - matching lucide-react names
export const Shield: React.FC<IconProps> = (props) => <Icon {...props} icon="🛡️" label="Shield" />;
export const AlertCircle: React.FC<IconProps> = (props) => <Icon {...props} icon="⚠️" label="Alert" />;
export const Key: React.FC<IconProps> = (props) => <Icon {...props} icon="🔑" label="Key" />;
export const ShieldAlert: React.FC<IconProps> = (props) => <Icon {...props} icon="🛡️⚠️" label="Shield Alert" />;
export const ShieldX: React.FC<IconProps> = (props) => <Icon {...props} icon="🛡️❌" label="Shield X" />;
export const Home: React.FC<IconProps> = (props) => <Icon {...props} icon="🏠" label="Home" />;
export const LogOut: React.FC<IconProps> = (props) => <Icon {...props} icon="🚪" label="Log Out" />;
export const User: React.FC<IconProps> = (props) => <Icon {...props} icon="👤" label="User" />;
export const Users: React.FC<IconProps> = (props) => <Icon {...props} icon="👥" label="Users" />;
export const Plus: React.FC<IconProps> = (props) => <Icon {...props} icon="➕" label="Plus" />;
export const Pencil: React.FC<IconProps> = (props) => <Icon {...props} icon="✏️" label="Edit" />;
export const Trash2: React.FC<IconProps> = (props) => <Icon {...props} icon="🗑️" label="Delete" />;
export const CheckCircle: React.FC<IconProps> = (props) => <Icon {...props} icon="✅" label="Check" />;
export const XCircle: React.FC<IconProps> = (props) => <Icon {...props} icon="❌" label="X" />;
export const AlertTriangle: React.FC<IconProps> = (props) => <Icon {...props} icon="⚠️" label="Warning" />;
export const RefreshCw: React.FC<IconProps> = (props) => <Icon {...props} icon="🔄" label="Refresh" />;
export const Download: React.FC<IconProps> = (props) => <Icon {...props} icon="⬇️" label="Download" />;
export const FileText: React.FC<IconProps> = (props) => <Icon {...props} icon="📄" label="File" />;
export const Search: React.FC<IconProps> = (props) => <Icon {...props} icon="🔍" label="Search" />;
export const Calendar: React.FC<IconProps> = (props) => <Icon {...props} icon="📅" label="Calendar" />;
export const Clock: React.FC<IconProps> = (props) => <Icon {...props} icon="🕐" label="Clock" />;
export const GitBranch: React.FC<IconProps> = (props) => <Icon {...props} icon="🌿" label="Branch" />;
export const Package: React.FC<IconProps> = (props) => <Icon {...props} icon="📦" label="Package" />;
export const Activity: React.FC<IconProps> = (props) => <Icon {...props} icon="📊" label="Activity" />;
export const Save: React.FC<IconProps> = (props) => <Icon {...props} icon="💾" label="Save" />;
export const UserPlus: React.FC<IconProps> = (props) => <Icon {...props} icon="👤➕" label="Add User" />;
export const Edit2: React.FC<IconProps> = (props) => <Icon {...props} icon="✏️" label="Edit" />;
export const ArrowLeft: React.FC<IconProps> = (props) => <Icon {...props} icon="⬅️" label="Back" />;
export const Copy: React.FC<IconProps> = (props) => <Icon {...props} icon="📋" label="Copy" />;
export const FolderOpen: React.FC<IconProps> = (props) => <Icon {...props} icon="📂" label="Folder" />;
export const ExternalLink: React.FC<IconProps> = (props) => <Icon {...props} icon="🔗" label="Link" />;
export const HelpCircle: React.FC<IconProps> = (props) => <Icon {...props} icon="❓" label="Help" />;
export const BookOpen: React.FC<IconProps> = (props) => <Icon {...props} icon="📖" label="Book" />;
export const Globe: React.FC<IconProps> = (props) => <Icon {...props} icon="🌐" label="Globe" />;

// Sidebar icons
export const LayoutDashboard: React.FC<IconProps> = (props) => <Icon {...props} icon="📊" label="Dashboard" />;
export const Building2: React.FC<IconProps> = (props) => <Icon {...props} icon="🏢" label="Building" />;
export const ClipboardCheck: React.FC<IconProps> = (props) => <Icon {...props} icon="📋" label="Tasks" />;
export const FileCheck: React.FC<IconProps> = (props) => <Icon {...props} icon="📄✓" label="File Check" />;
export const Settings: React.FC<IconProps> = (props) => <Icon {...props} icon="⚙️" label="Settings" />;
export const InfoIcon: React.FC<IconProps> = (props) => <Icon {...props} icon="ℹ️" label="Info" />;
export const CheckSquare: React.FC<IconProps> = (props) => <Icon {...props} icon="☑️" label="Check Square" />;
export const CreditCard: React.FC<IconProps> = (props) => <Icon {...props} icon="💳" label="Credit Card" />;
export const Info: React.FC<IconProps> = (props) => <Icon {...props} icon="ℹ️" label="Info" />;
export const Mail: React.FC<IconProps> = (props) => <Icon {...props} icon="✉️" label="Mail" />;
export const Plug: React.FC<IconProps> = (props) => <Icon {...props} icon="🔌" label="Plug" />;
export const Eye: React.FC<IconProps> = (props) => <Icon {...props} icon="👁️" label="View" />;
export const MapPin: React.FC<IconProps> = (props) => <Icon {...props} icon="📍" label="Location" />;
