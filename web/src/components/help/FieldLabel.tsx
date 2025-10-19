import type React from 'react';
import { HelpTooltip } from './HelpTooltip';

interface FieldLabelProps {
  text: string;
  helpText?: string;
  required?: boolean;
  dataTestId?: string;
}

/**
 * Custom label component for Kendo Form Fields with help tooltip
 * Use with Field component: <Field name="x" label={(props) => <FieldLabel {...props} helpText="..." />} />
 */
export const FieldLabel: React.FC<FieldLabelProps> = ({
  text,
  helpText,
  required = false,
  dataTestId,
}) => {
  return (
    <span className="field-label-with-help">
      {text}
      {required && <span className="required" style={{ color: '#d13438', marginLeft: '4px' }}>*</span>}
      {helpText && <HelpTooltip content={helpText} dataTestId={dataTestId} />}
    </span>
  );
};
