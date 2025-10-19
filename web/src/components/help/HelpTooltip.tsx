import type React from 'react';
import { Tooltip } from '@progress/kendo-react-tooltip';
import { Icon } from '@progress/kendo-react-common';

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
  const iconMap = {
    info: 'info-circle',
    question: 'question-circle',
    help: 'help',
  };

  return (
    <Tooltip anchorElement="target" position={position} openDelay={100}>
      <span
        className="help-icon"
        data-testid={dataTestId}
        title={typeof content === 'string' ? content : undefined}
        role="tooltip"
        aria-label="Help information"
      >
        <Icon name={iconMap[icon]} style={{ color: '#0078d4', fontSize: '16px' }} />
      </span>
    </Tooltip>
  );
};
