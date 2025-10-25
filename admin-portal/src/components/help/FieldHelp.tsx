import type React from 'react';
import { HelpTooltip } from './HelpTooltip';

interface FieldHelpProps {
  label: string;
  helpText: string;
  required?: boolean;
  children: React.ReactNode;
  htmlFor?: string;
  dataTestId?: string;
}

export const FieldHelp: React.FC<FieldHelpProps> = ({
  label,
  helpText,
  required = false,
  children,
  htmlFor,
  dataTestId,
}) => {
  return (
    <div className="field-with-help">
      <label htmlFor={htmlFor}>
        {label}
        {required && <span className="required">*</span>}
        <HelpTooltip content={helpText} dataTestId={dataTestId} />
      </label>
      {children}
    </div>
  );
};
