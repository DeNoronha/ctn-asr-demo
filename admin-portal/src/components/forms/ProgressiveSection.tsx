import { Button } from '@mantine/core';

import type React from 'react';
import { useState } from 'react';

interface ProgressiveSectionProps {
  title: string;
  defaultExpanded?: boolean;
  storageKey?: string; // For remembering state
  children: React.ReactNode;
  className?: string;
}

export const ProgressiveSection: React.FC<ProgressiveSectionProps> = ({
  title,
  defaultExpanded = false,
  storageKey,
  children,
  className = '',
}) => {
  // Load state from localStorage if storageKey provided
  const [expanded, setExpanded] = useState(() => {
    if (storageKey) {
      const stored = localStorage.getItem(`progressive-${storageKey}`);
      return stored ? JSON.parse(stored) : defaultExpanded;
    }
    return defaultExpanded;
  });

  const toggle = () => {
    const newState = !expanded;
    setExpanded(newState);

    if (storageKey) {
      localStorage.setItem(`progressive-${storageKey}`, JSON.stringify(newState));
    }
  };

  const sectionId = `section-${title.replace(/\s+/g, '-').toLowerCase()}`;

  return (
    <div className={`progressive-section ${className}`}>
      <Button
        onClick={toggle}
        variant="subtle"
        className="progressive-toggle"
        leftSection={expanded ? 'chevron-down' : 'chevron-right'}
        aria-expanded={expanded}
        aria-controls={sectionId}
        type="button"
      >
        {title}
      </Button>

      {expanded && (
        <div
          id={sectionId}
          className="progressive-content"
          role="region"
          aria-label={title}
        >
          {children}
        </div>
      )}
    </div>
  );
};
