/**
 * Global Keyboard Shortcuts Hook
 * Provides application-wide keyboard shortcuts for frequent actions
 * Platform-aware: Cmd on macOS, Ctrl on Windows/Linux
 */

import { useHotkeys } from '@mantine/hooks';
import { useCallback, useState } from 'react';

export interface ShortcutAction {
  key: string;
  description: string;
  category: 'navigation' | 'actions' | 'search' | 'general';
  action: () => void;
}

interface UseGlobalShortcutsProps {
  onNavigate?: (route: string) => void;
  onSearch?: () => void;
  onNewUser?: () => void;
  onExport?: () => void;
  onFilter?: () => void;
}

export function useGlobalShortcuts({
  onNavigate,
  onSearch,
  onNewUser,
  onExport,
  onFilter,
}: UseGlobalShortcutsProps = {}) {
  const [helpModalOpened, setHelpModalOpened] = useState(false);

  // Navigation shortcuts
  const handleNavigateDashboard = useCallback(() => {
    onNavigate?.('dashboard');
  }, [onNavigate]);

  const handleNavigateMembers = useCallback(() => {
    onNavigate?.('members');
  }, [onNavigate]);

  const handleNavigateAuditLogs = useCallback(() => {
    onNavigate?.('audit');
  }, [onNavigate]);

  const handleNavigateUserManagement = useCallback(() => {
    onNavigate?.('settings');
  }, [onNavigate]);

  const handleNavigateHealth = useCallback(() => {
    onNavigate?.('health');
  }, [onNavigate]);

  const handleNavigateEndpoints = useCallback(() => {
    onNavigate?.('endpoints');
  }, [onNavigate]);

  const handleNavigateTasks = useCallback(() => {
    onNavigate?.('tasks');
  }, [onNavigate]);

  // Action shortcuts
  const handleSearch = useCallback(() => {
    onSearch?.();
  }, [onSearch]);

  const handleNewUser = useCallback(() => {
    onNewUser?.();
  }, [onNewUser]);

  const handleExport = useCallback(() => {
    onExport?.();
  }, [onExport]);

  const handleFilter = useCallback(() => {
    onFilter?.();
  }, [onFilter]);

  // Help modal toggle
  const handleToggleHelp = useCallback(() => {
    setHelpModalOpened((prev) => !prev);
  }, []);

  // Register all hotkeys
  useHotkeys([
    // Navigation (mod = Cmd on macOS, Ctrl on Windows/Linux)
    ['mod+shift+d', handleNavigateDashboard],
    ['mod+shift+m', handleNavigateMembers],
    ['mod+shift+l', handleNavigateAuditLogs],
    ['mod+shift+u', handleNavigateUserManagement],
    ['mod+shift+h', handleNavigateHealth],
    ['mod+shift+e', handleNavigateEndpoints],
    ['mod+shift+t', handleNavigateTasks],

    // Actions
    ['mod+k', handleSearch],
    ['mod+n', handleNewUser],
    ['mod+e', handleExport],
    ['mod+f', handleFilter],

    // Help (both ? and Ctrl+/)
    ['?', handleToggleHelp],
    ['mod+/', handleToggleHelp],
  ]);

  // Return state and controls
  return {
    helpModalOpened,
    setHelpModalOpened,
    shortcuts: getShortcutsList(),
  };
}

/**
 * Get list of all available shortcuts for display
 * Platform-aware: shows Cmd on macOS, Ctrl elsewhere
 */
export function getShortcutsList(): ShortcutAction[] {
  const isMac =
    typeof navigator !== 'undefined' && navigator.platform.toUpperCase().includes('MAC');
  const modKey = isMac ? 'Cmd' : 'Ctrl';

  return [
    // Navigation shortcuts
    {
      key: `${modKey}+Shift+D`,
      description: 'shortcuts.navigateDashboard',
      category: 'navigation',
      action: () => {},
    },
    {
      key: `${modKey}+Shift+M`,
      description: 'shortcuts.navigateMembers',
      category: 'navigation',
      action: () => {},
    },
    {
      key: `${modKey}+Shift+L`,
      description: 'shortcuts.navigateAuditLogs',
      category: 'navigation',
      action: () => {},
    },
    {
      key: `${modKey}+Shift+U`,
      description: 'shortcuts.navigateUserManagement',
      category: 'navigation',
      action: () => {},
    },
    {
      key: `${modKey}+Shift+H`,
      description: 'shortcuts.navigateHealth',
      category: 'navigation',
      action: () => {},
    },
    {
      key: `${modKey}+Shift+E`,
      description: 'shortcuts.navigateEndpoints',
      category: 'navigation',
      action: () => {},
    },
    {
      key: `${modKey}+Shift+T`,
      description: 'shortcuts.navigateTasks',
      category: 'navigation',
      action: () => {},
    },

    // Action shortcuts
    {
      key: `${modKey}+K`,
      description: 'shortcuts.search',
      category: 'search',
      action: () => {},
    },
    {
      key: `${modKey}+N`,
      description: 'shortcuts.newUser',
      category: 'actions',
      action: () => {},
    },
    {
      key: `${modKey}+E`,
      description: 'shortcuts.export',
      category: 'actions',
      action: () => {},
    },
    {
      key: `${modKey}+F`,
      description: 'shortcuts.filter',
      category: 'search',
      action: () => {},
    },

    // General shortcuts
    {
      key: `? or ${modKey}+/`,
      description: 'shortcuts.help',
      category: 'general',
      action: () => {},
    },
    {
      key: 'Esc',
      description: 'shortcuts.closeModal',
      category: 'general',
      action: () => {},
    },
  ];
}
