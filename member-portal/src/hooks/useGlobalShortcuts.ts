/**
 * Global Keyboard Shortcuts Hook (Member Portal)
 * Provides application-wide keyboard shortcuts for frequent actions
 * Platform-aware: Cmd on macOS, Ctrl on Windows/Linux
 */

import { useHotkeys } from '@mantine/hooks';
import { useState, useCallback } from 'react';

export interface ShortcutAction {
  key: string;
  description: string;
  category: 'navigation' | 'actions' | 'search' | 'general';
  action: () => void;
}

interface UseGlobalShortcutsProps {
  onNavigate?: (route: 'dashboard' | 'profile' | 'contacts' | 'integrations' | 'api-access' | 'dns-verification' | 'support') => void;
  onSearch?: () => void;
  onNewMember?: () => void;
}

export function useGlobalShortcuts({
  onNavigate,
  onSearch,
  onNewMember,
}: UseGlobalShortcutsProps = {}) {
  const [helpModalOpened, setHelpModalOpened] = useState(false);

  // Navigation shortcuts
  const handleNavigateDashboard = useCallback(() => {
    onNavigate?.('dashboard');
  }, [onNavigate]);

  const handleNavigateProfile = useCallback(() => {
    onNavigate?.('profile');
  }, [onNavigate]);

  const handleNavigateContacts = useCallback(() => {
    onNavigate?.('contacts');
  }, [onNavigate]);

  const handleNavigateIntegrations = useCallback(() => {
    onNavigate?.('integrations');
  }, [onNavigate]);

  const handleNavigateApiAccess = useCallback(() => {
    onNavigate?.('api-access');
  }, [onNavigate]);

  const handleNavigateDnsVerification = useCallback(() => {
    onNavigate?.('dns-verification');
  }, [onNavigate]);

  const handleNavigateSupport = useCallback(() => {
    onNavigate?.('support');
  }, [onNavigate]);

  // Action shortcuts
  const handleSearch = useCallback(() => {
    onSearch?.();
  }, [onSearch]);

  const handleNewMember = useCallback(() => {
    onNewMember?.();
  }, [onNewMember]);

  // Help modal toggle
  const handleToggleHelp = useCallback(() => {
    setHelpModalOpened((prev) => !prev);
  }, []);

  // Register all hotkeys
  useHotkeys([
    // Navigation (mod = Cmd on macOS, Ctrl on Windows/Linux)
    ['mod+shift+d', handleNavigateDashboard],
    ['mod+shift+p', handleNavigateProfile],
    ['mod+shift+c', handleNavigateContacts],
    ['mod+shift+e', handleNavigateIntegrations],
    ['mod+shift+a', handleNavigateApiAccess],
    ['mod+shift+v', handleNavigateDnsVerification],
    ['mod+shift+s', handleNavigateSupport],

    // Actions
    ['mod+k', handleSearch],
    ['mod+n', handleNewMember],

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
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().includes('MAC');
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
      key: `${modKey}+Shift+P`,
      description: 'shortcuts.navigateProfile',
      category: 'navigation',
      action: () => {},
    },
    {
      key: `${modKey}+Shift+C`,
      description: 'shortcuts.navigateContacts',
      category: 'navigation',
      action: () => {},
    },
    {
      key: `${modKey}+Shift+E`,
      description: 'shortcuts.navigateIntegrations',
      category: 'navigation',
      action: () => {},
    },
    {
      key: `${modKey}+Shift+A`,
      description: 'shortcuts.navigateApiAccess',
      category: 'navigation',
      action: () => {},
    },
    {
      key: `${modKey}+Shift+V`,
      description: 'shortcuts.navigateDnsVerification',
      category: 'navigation',
      action: () => {},
    },
    {
      key: `${modKey}+Shift+S`,
      description: 'shortcuts.navigateSupport',
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
      description: 'shortcuts.newMember',
      category: 'actions',
      action: () => {},
    },

    // General shortcuts
    {
      key: '? or ' + `${modKey}+/`,
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
