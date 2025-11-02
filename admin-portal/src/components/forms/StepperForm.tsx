import { Button, Stepper } from '@mantine/core';

import type React from 'react';
import { useState } from 'react';

interface StepperFormProps<T = Record<string, unknown>> {
  steps: Array<{
    label: string;
    component: React.ReactNode;
    isValid?: () => boolean;
  }>;
  onComplete: (data: T) => void;
  formData?: T;
  onFormDataChange?: (data: T) => void;
}

export const StepperForm = <T = Record<string, unknown>>({
  steps,
  onComplete,
  formData = {} as T,
  onFormDataChange,
}: StepperFormProps<T>) => {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      // Validate current step before advancing
      if (!steps[currentStep].isValid || steps[currentStep].isValid()) {
        setCurrentStep(currentStep + 1);
      }
    } else {
      // Last step - complete the form
      onComplete(formData);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepClick = (stepIndex: number) => {
    // Allow direct navigation if previous steps are valid
    if (stepIndex < currentStep) {
      setCurrentStep(stepIndex);
    } else if (stepIndex === currentStep + 1) {
      handleNext();
    }
  };

  return (
    <div className="stepper-form">
      <Stepper active={currentStep} onStepClick={handleStepClick}>
        {steps.map((step, index) => (
          <Stepper.Step key={index} label={step.label} />
        ))}
      </Stepper>

      <div className="step-content">{steps[currentStep].component}</div>

      <div className="step-actions">
        <Button onClick={handleBack} disabled={currentStep === 0} type="button">
          Back
        </Button>
        <Button onClick={handleNext} color="blue" type="button">
          {currentStep === steps.length - 1 ? 'Complete' : 'Next'}
        </Button>
      </div>
    </div>
  );
};
