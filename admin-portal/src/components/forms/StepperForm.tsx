import { Button } from '@progress/kendo-react-buttons';
import { Stepper } from '@progress/kendo-react-layout';
import type React from 'react';
import { useState } from 'react';

interface StepperFormProps {
  steps: Array<{
    label: string;
    component: React.ReactNode;
    isValid?: () => boolean;
  }>;
  onComplete: (data: any) => void;
  formData?: any;
  onFormDataChange?: (data: any) => void;
}

export const StepperForm: React.FC<StepperFormProps> = ({
  steps,
  onComplete,
  formData = {},
  onFormDataChange,
}) => {
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

  const handleStepChange = (e: { value: number }) => {
    // Allow direct navigation if previous steps are valid
    if (e.value < currentStep) {
      setCurrentStep(e.value);
    } else if (e.value === currentStep + 1) {
      handleNext();
    }
  };

  return (
    <div className="stepper-form">
      <Stepper
        value={currentStep}
        onChange={handleStepChange}
        items={steps.map((s) => ({ label: s.label }))}
      />

      <div className="step-content">{steps[currentStep].component}</div>

      <div className="step-actions">
        <Button onClick={handleBack} disabled={currentStep === 0} type="button">
          Back
        </Button>
        <Button onClick={handleNext} themeColor="primary" type="button">
          {currentStep === steps.length - 1 ? 'Complete' : 'Next'}
        </Button>
      </div>
    </div>
  );
};
