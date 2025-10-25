import type React from 'react';

interface ConditionalFieldProps {
  show: boolean;
  children: React.ReactNode;
  animation?: boolean;
}

export const ConditionalField: React.FC<ConditionalFieldProps> = ({
  show,
  children,
  animation = true,
}) => {
  if (!animation) {
    return show ? <>{children}</> : null;
  }

  return (
    <div
      className={`conditional-field ${show ? 'visible' : 'hidden'}`}
      aria-hidden={!show}
    >
      {show && children}
    </div>
  );
};
