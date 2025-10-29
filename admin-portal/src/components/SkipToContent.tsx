/**
 * SkipToContent component (DA-003)
 *
 * Provides a keyboard-accessible skip navigation link for screen reader users
 * and keyboard-only navigation. The link is visually hidden until focused.
 *
 * WCAG 2.1 Success Criterion 2.4.1 (Level A): Bypass Blocks
 * @see https://www.w3.org/WAI/WCAG21/Understanding/bypass-blocks.html
 */

import type React from 'react';
import { useSkipToMain } from '../hooks/useKeyboardNav';
import './SkipToContent.css';

interface SkipToContentProps {
  mainContentId?: string;
  label?: string;
}

export const SkipToContent: React.FC<SkipToContentProps> = ({
  mainContentId = 'main-content',
  label = 'Skip to main content',
}) => {
  const skipToMain = useSkipToMain(mainContentId);

  return (
    <a
      href={`#${mainContentId}`}
      className="skip-to-content"
      onClick={(e) => {
        e.preventDefault();
        skipToMain();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          skipToMain();
        }
      }}
    >
      {label}
    </a>
  );
};
