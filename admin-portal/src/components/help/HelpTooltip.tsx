import { Tooltip } from '@mantine/core';
import type React from 'react';
import { TEXT_COLORS } from '../../utils/colors';

interface HelpTooltipProps {
  content: string | React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  icon?: 'info' | 'question' | 'help';
  dataTestId?: string;
}

export const HelpTooltip: React.FC<HelpTooltipProps> = ({
  content,
  position = 'top',
  icon = 'info',
  dataTestId,
}) => {
  const iconSymbol = {
    info: 'ℹ️',
    question: '❓',
    help: '❔',
  };

  return (
    <Tooltip label={content} position={position} openDelay={100} withArrow>
      <span
        className="help-icon"
        data-testid={dataTestId}
        aria-label="Help information"
        style={{
          color: TEXT_COLORS.info,
          fontSize: '16px',
          cursor: 'help',
          display: 'inline-flex',
          alignItems: 'center',
        }}
      >
        {iconSymbol[icon]}
      </span>
    </Tooltip>
  );
};
