/**
 * Keyboard Navigation Hooks (DA-003)
 *
 * Provides reusable keyboard navigation patterns for WCAG 2.1 AA compliance:
 * - Focus trap for modals and dialogs
 * - Arrow key navigation for lists and menus
 * - Escape key handling
 * - Tab key management
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/
 */

import { useEffect, useCallback, type RefObject } from 'react';

/**
 * Focus trap for modal dialogs
 * Keeps keyboard focus within the dialog while open
 *
 * @param containerRef - Reference to dialog container element
 * @param isOpen - Whether the dialog is currently open
 * @param onClose - Function to call when Escape is pressed
 *
 * @example
 * const dialogRef = useRef<HTMLDivElement>(null);
 * useFocusTrap(dialogRef, isDialogOpen, handleClose);
 */
export const useFocusTrap = (
  containerRef: RefObject<HTMLElement>,
  isOpen: boolean,
  onClose?: () => void
) => {
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Handle Tab key to trap focus within dialog
    const handleTab = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      if (event.shiftKey) {
        // Shift+Tab: Focus last element when on first
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab: Focus first element when on last
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement?.focus();
        }
      }
    };

    // Handle Escape key to close dialog
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && onClose) {
        event.preventDefault();
        onClose();
      }
    };

    container.addEventListener('keydown', handleTab);
    if (onClose) {
      container.addEventListener('keydown', handleEscape);
    }

    // Auto-focus first element when dialog opens
    firstElement?.focus();

    return () => {
      container.removeEventListener('keydown', handleTab);
      if (onClose) {
        container.removeEventListener('keydown', handleEscape);
      }
    };
  }, [isOpen, containerRef, onClose]);
};

/**
 * Arrow key navigation for lists
 * Enables up/down arrow keys to navigate through list items
 *
 * @param listRef - Reference to list container element
 * @param itemSelector - CSS selector for list items
 * @param onSelect - Callback when item is selected with Enter/Space
 *
 * @example
 * const listRef = useRef<HTMLUListElement>(null);
 * useArrowKeyNav(listRef, 'li[role="option"]', handleSelect);
 */
export const useArrowKeyNav = (
  listRef: RefObject<HTMLElement>,
  itemSelector: string,
  onSelect?: (index: number) => void
) => {
  useEffect(() => {
    if (!listRef.current) return;

    const list = listRef.current;
    let currentIndex = 0;

    const handleKeyDown = (event: KeyboardEvent) => {
      const items = Array.from(list.querySelectorAll<HTMLElement>(itemSelector));
      if (items.length === 0) return;

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          currentIndex = Math.min(currentIndex + 1, items.length - 1);
          items[currentIndex]?.focus();
          break;

        case 'ArrowUp':
          event.preventDefault();
          currentIndex = Math.max(currentIndex - 1, 0);
          items[currentIndex]?.focus();
          break;

        case 'Home':
          event.preventDefault();
          currentIndex = 0;
          items[0]?.focus();
          break;

        case 'End':
          event.preventDefault();
          currentIndex = items.length - 1;
          items[currentIndex]?.focus();
          break;

        case 'Enter':
        case ' ':
          if (onSelect) {
            event.preventDefault();
            onSelect(currentIndex);
          }
          break;
      }
    };

    list.addEventListener('keydown', handleKeyDown);
    return () => list.removeEventListener('keydown', handleKeyDown);
  }, [listRef, itemSelector, onSelect]);
};

/**
 * Global keyboard shortcut handler
 * Registers keyboard shortcuts for common actions
 *
 * @param shortcuts - Map of key combinations to handlers
 * @param enabled - Whether shortcuts are currently enabled
 *
 * @example
 * useKeyboardShortcuts({
 *   'ctrl+s': handleSave,
 *   'ctrl+f': handleSearch,
 *   'escape': handleClose
 * }, isModalOpen);
 */
export const useKeyboardShortcuts = (
  shortcuts: Record<string, () => void>,
  enabled: boolean = true
) => {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      const key = event.key.toLowerCase();
      const ctrl = event.ctrlKey || event.metaKey;
      const shift = event.shiftKey;
      const alt = event.altKey;

      // Build key combination string
      const parts: string[] = [];
      if (ctrl) parts.push('ctrl');
      if (shift) parts.push('shift');
      if (alt) parts.push('alt');
      parts.push(key);
      const combination = parts.join('+');

      // Check for matching shortcut
      const handler = shortcuts[combination] || shortcuts[key];
      if (handler) {
        event.preventDefault();
        handler();
      }
    },
    [shortcuts, enabled]
  );

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown, enabled]);
};

/**
 * Skip navigation link helper
 * Scrolls to main content and sets focus
 *
 * @param mainContentId - ID of main content element
 *
 * @example
 * const skipToMain = useSkipToMain('main-content');
 * <button onClick={skipToMain}>Skip to main content</button>
 */
export const useSkipToMain = (mainContentId: string) => {
  return useCallback(() => {
    const mainContent = document.getElementById(mainContentId);
    if (mainContent) {
      mainContent.scrollIntoView({ behavior: 'smooth', block: 'start' });
      mainContent.setAttribute('tabindex', '-1');
      mainContent.focus();
      // Remove tabindex after focus to preserve normal tab order
      setTimeout(() => mainContent.removeAttribute('tabindex'), 100);
    }
  }, [mainContentId]);
};
