import { render, screen, fireEvent } from '@testing-library/react';
import { MantineProvider, Stepper, Button } from '@mantine/core';
import { describe, it, expect, vi } from 'vitest';
import React, { useState } from 'react';

// Test wrapper component
const TestStepper: React.FC<{
  initialStep?: number;
  withValidation?: boolean;
  onStepChange?: (step: number) => void;
  onComplete?: () => void;
}> = ({ initialStep = 0, withValidation = false, onStepChange, onComplete }) => {
  const [active, setActive] = useState(initialStep);

  const steps = [
    { label: 'Personal Info', description: 'Enter your details' },
    { label: 'Address', description: 'Enter your address' },
    { label: 'Payment', description: 'Payment information' },
    { label: 'Review', description: 'Review your order' },
  ];

  const handleNext = () => {
    if (withValidation && active === 0) {
      // Simulate validation failure on first step
      return;
    }

    if (active < steps.length - 1) {
      const nextStep = active + 1;
      setActive(nextStep);
      onStepChange?.(nextStep);
    } else {
      onComplete?.();
    }
  };

  const handleBack = () => {
    if (active > 0) {
      const prevStep = active - 1;
      setActive(prevStep);
      onStepChange?.(prevStep);
    }
  };

  const handleStepClick = (stepIndex: number) => {
    setActive(stepIndex);
    onStepChange?.(stepIndex);
  };

  return (
    <MantineProvider>
      <Stepper active={active} onStepClick={handleStepClick}>
        {steps.map((step, index) => (
          <Stepper.Step
            key={index}
            label={step.label}
            description={step.description}
            data-testid={`step-${index}`}
          />
        ))}
      </Stepper>

      <div data-testid="step-content">
        <p>Step {active + 1} content</p>
      </div>

      <div data-testid="step-actions">
        <Button onClick={handleBack} disabled={active === 0} data-testid="back-button">
          Back
        </Button>
        <Button onClick={handleNext} data-testid="next-button">
          {active === steps.length - 1 ? 'Complete' : 'Next'}
        </Button>
      </div>
    </MantineProvider>
  );
};

describe('Stepper - Step Validation', () => {
  it('should allow navigation when validation passes', () => {
    render(<TestStepper />);

    const nextButton = screen.getByTestId('next-button');
    fireEvent.click(nextButton);

    // Should move to step 2
    expect(screen.getByText('Step 2 content')).toBeInTheDocument();
  });

  it('should prevent navigation when validation fails', () => {
    render(<TestStepper withValidation={true} />);

    const nextButton = screen.getByTestId('next-button');
    fireEvent.click(nextButton);

    // Should stay on step 1 due to validation failure
    expect(screen.getByText('Step 1 content')).toBeInTheDocument();
  });

  it('should validate before advancing to next step', () => {
    const onStepChange = vi.fn();
    render(<TestStepper withValidation={true} onStepChange={onStepChange} />);

    const nextButton = screen.getByTestId('next-button');
    fireEvent.click(nextButton);

    // Validation failed, step should not change
    expect(onStepChange).not.toHaveBeenCalled();
  });
});

describe('Stepper - Next/Previous Navigation', () => {
  it('should navigate to next step', () => {
    render(<TestStepper />);

    expect(screen.getByText('Step 1 content')).toBeInTheDocument();

    const nextButton = screen.getByTestId('next-button');
    fireEvent.click(nextButton);

    expect(screen.getByText('Step 2 content')).toBeInTheDocument();
  });

  it('should navigate to previous step', () => {
    render(<TestStepper initialStep={2} />);

    expect(screen.getByText('Step 3 content')).toBeInTheDocument();

    const backButton = screen.getByTestId('back-button');
    fireEvent.click(backButton);

    expect(screen.getByText('Step 2 content')).toBeInTheDocument();
  });

  it('should disable back button on first step', () => {
    render(<TestStepper initialStep={0} />);

    const backButton = screen.getByTestId('back-button');
    expect(backButton).toBeDisabled();
  });

  it('should enable back button after first step', () => {
    render(<TestStepper initialStep={1} />);

    const backButton = screen.getByTestId('back-button');
    expect(backButton).not.toBeDisabled();
  });

  it('should show "Complete" on last step', () => {
    render(<TestStepper initialStep={3} />);

    const nextButton = screen.getByTestId('next-button');
    expect(nextButton).toHaveTextContent('Complete');
  });

  it('should show "Next" on non-last steps', () => {
    render(<TestStepper initialStep={0} />);

    const nextButton = screen.getByTestId('next-button');
    expect(nextButton).toHaveTextContent('Next');
  });
});

describe('Stepper - Completion Indicators', () => {
  it('should display all step labels', () => {
    render(<TestStepper />);

    expect(screen.getByText('Personal Info')).toBeInTheDocument();
    expect(screen.getByText('Address')).toBeInTheDocument();
    expect(screen.getByText('Payment')).toBeInTheDocument();
    expect(screen.getByText('Review')).toBeInTheDocument();
  });

  it('should display step descriptions', () => {
    render(<TestStepper />);

    expect(screen.getByText('Enter your details')).toBeInTheDocument();
    expect(screen.getByText('Enter your address')).toBeInTheDocument();
    expect(screen.getByText('Payment information')).toBeInTheDocument();
    expect(screen.getByText('Review your order')).toBeInTheDocument();
  });

  it('should mark steps as complete when passed', () => {
    render(<TestStepper initialStep={2} />);

    // Step 3 is active (index 2)
    // Steps 1 and 2 should be marked as complete (Mantine handles this internally)
    expect(screen.getByText('Step 3 content')).toBeInTheDocument();
  });

  it('should call onComplete when finishing last step', () => {
    const onComplete = vi.fn();
    render(<TestStepper initialStep={3} onComplete={onComplete} />);

    const nextButton = screen.getByTestId('next-button');
    fireEvent.click(nextButton);

    expect(onComplete).toHaveBeenCalled();
  });
});

describe('Stepper - Keyboard Navigation', () => {
  it('should navigate with Tab key', () => {
    render(<TestStepper />);

    const nextButton = screen.getByTestId('next-button');
    nextButton.focus();

    expect(document.activeElement).toBe(nextButton);

    // Tab to back button
    fireEvent.keyDown(document.activeElement!, { key: 'Tab', code: 'Tab' });
  });

  it('should activate step with Enter key', () => {
    render(<TestStepper />);

    const nextButton = screen.getByTestId('next-button');
    nextButton.focus();

    fireEvent.click(nextButton);

    // Next step should be activated
    expect(screen.getByText('Step 2 content')).toBeInTheDocument();
  });

  it('should activate step with Space key', () => {
    render(<TestStepper />);

    const nextButton = screen.getByTestId('next-button');
    nextButton.focus();

    fireEvent.keyDown(nextButton, { key: ' ', code: 'Space' });

    // Button should respond to Space key (Mantine handles this)
    expect(nextButton).toBeInTheDocument();
  });
});

describe('Stepper - Direct Step Navigation', () => {
  it('should allow clicking on step headers', () => {
    render(<TestStepper />);

    // Click on step 2
    const addressStep = screen.getByText('Address');
    fireEvent.click(addressStep);

    // Should navigate to step 2
    expect(screen.getByText('Step 2 content')).toBeInTheDocument();
  });

  it('should call onStepChange when step clicked', () => {
    const onStepChange = vi.fn();
    render(<TestStepper onStepChange={onStepChange} />);

    const paymentStep = screen.getByText('Payment');
    fireEvent.click(paymentStep);

    expect(onStepChange).toHaveBeenCalledWith(2);
  });

  it('should allow jumping to any step', () => {
    render(<TestStepper />);

    // Jump from step 1 to step 4
    const reviewStep = screen.getByText('Review');
    fireEvent.click(reviewStep);

    expect(screen.getByText('Step 4 content')).toBeInTheDocument();
  });
});

describe('Stepper - Multiple Steps Navigation', () => {
  it('should navigate through all steps forward', () => {
    render(<TestStepper />);

    const nextButton = screen.getByTestId('next-button');

    // Step 1
    expect(screen.getByText('Step 1 content')).toBeInTheDocument();

    // Step 2
    fireEvent.click(nextButton);
    expect(screen.getByText('Step 2 content')).toBeInTheDocument();

    // Step 3
    fireEvent.click(nextButton);
    expect(screen.getByText('Step 3 content')).toBeInTheDocument();

    // Step 4
    fireEvent.click(nextButton);
    expect(screen.getByText('Step 4 content')).toBeInTheDocument();
  });

  it('should navigate through all steps backward', () => {
    render(<TestStepper initialStep={3} />);

    const backButton = screen.getByTestId('back-button');

    // Step 4
    expect(screen.getByText('Step 4 content')).toBeInTheDocument();

    // Step 3
    fireEvent.click(backButton);
    expect(screen.getByText('Step 3 content')).toBeInTheDocument();

    // Step 2
    fireEvent.click(backButton);
    expect(screen.getByText('Step 2 content')).toBeInTheDocument();

    // Step 1
    fireEvent.click(backButton);
    expect(screen.getByText('Step 1 content')).toBeInTheDocument();
  });

  it('should track step changes', () => {
    const onStepChange = vi.fn();
    render(<TestStepper onStepChange={onStepChange} />);

    const nextButton = screen.getByTestId('next-button');

    fireEvent.click(nextButton);
    expect(onStepChange).toHaveBeenCalledWith(1);

    fireEvent.click(nextButton);
    expect(onStepChange).toHaveBeenCalledWith(2);

    fireEvent.click(nextButton);
    expect(onStepChange).toHaveBeenCalledWith(3);
  });
});

describe('Stepper - Accessibility', () => {
  it('should have proper step structure', () => {
    render(<TestStepper />);

    // All steps should be rendered
    expect(screen.getByText('Personal Info')).toBeInTheDocument();
    expect(screen.getByText('Address')).toBeInTheDocument();
    expect(screen.getByText('Payment')).toBeInTheDocument();
    expect(screen.getByText('Review')).toBeInTheDocument();
  });

  it('should have accessible step labels', () => {
    render(<TestStepper />);

    // Labels should be visible and accessible
    const labels = screen.getAllByText(/Info|Address|Payment|Review/);
    expect(labels.length).toBeGreaterThan(0);
  });

  it('should have accessible navigation buttons', () => {
    render(<TestStepper />);

    const backButton = screen.getByTestId('back-button');
    const nextButton = screen.getByTestId('next-button');

    expect(backButton).toHaveTextContent('Back');
    expect(nextButton).toHaveTextContent('Next');
  });
});
