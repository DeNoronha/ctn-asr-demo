/**
 * Member Registration Form Component
 * Self-service registration for new CTN members
 */

import { Button, Checkbox, Select, Text, TextInput, Textarea } from '@mantine/core';
import { useForm } from '@mantine/form';
import type React from 'react';
import { useState } from 'react';

import { KvKDocumentUpload } from './KvKDocumentUpload';

interface RegistrationFormData {
  // Company Information
  legalName: string;
  kvkNumber: string;
  lei?: string;
  companyAddress: string;
  postalCode: string;
  city: string;
  country: string;

  // Contact Information
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  jobTitle: string;

  // Documents
  kvkDocument?: File;

  // Legal
  termsAccepted: boolean;
  gdprConsent: boolean;
}

interface RegistrationFormProps {
  onSubmit: (data: RegistrationFormData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

const countries = ['Netherlands', 'Belgium', 'Germany', 'France', 'United Kingdom', 'Other'];

// Validators (Mantine format - return null for valid, error message for invalid)
const requiredValidator = (value: unknown) => (value ? null : 'This field is required');

const emailValidator = (value: string) => {
  if (!value) return 'Email is required';
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value) ? null : 'Invalid email address';
};

const kvkValidator = (value: string) => {
  if (!value) return 'KvK number is required';
  // Dutch KvK number is 8 digits
  const kvkRegex = /^\d{8}$/;
  return kvkRegex.test(value) ? null : 'KvK number must be 8 digits';
};

const phoneValidator = (value: string) => {
  if (!value) return 'Phone number is required';
  const phoneRegex = /^[\d\s\+\-\(\)]+$/;
  return phoneRegex.test(value) ? null : 'Invalid phone number format';
};

const leiValidator = (value: string) => {
  if (!value) return null; // LEI is optional
  // LEI is 20 characters
  const leiRegex = /^[A-Z0-9]{20}$/;
  return leiRegex.test(value) ? null : 'LEI must be 20 alphanumeric characters';
};

export const RegistrationForm: React.FC<RegistrationFormProps> = ({
  onSubmit,
  onCancel,
  loading = false,
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [kvkDocument, setKvkDocument] = useState<File | null>(null);

  const form = useForm({
    initialValues: {
      legalName: '',
      kvkNumber: '',
      lei: '',
      companyAddress: '',
      postalCode: '',
      city: '',
      country: 'Netherlands',
      contactName: '',
      contactEmail: '',
      contactPhone: '',
      jobTitle: '',
      termsAccepted: false,
      gdprConsent: false,
    },
    validate: {
      legalName: requiredValidator,
      kvkNumber: kvkValidator,
      lei: leiValidator,
      companyAddress: requiredValidator,
      postalCode: requiredValidator,
      city: requiredValidator,
      country: requiredValidator,
      contactName: requiredValidator,
      contactEmail: emailValidator,
      contactPhone: phoneValidator,
      jobTitle: requiredValidator,
      termsAccepted: (value) => (value ? null : 'You must accept the terms'),
      gdprConsent: (value) => (value ? null : 'GDPR consent is required'),
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    const formData: RegistrationFormData = {
      ...values,
      kvkDocument: kvkDocument || undefined,
    };

    await onSubmit(formData);
  };

  const handleNext = () => {
    // Validate current step before proceeding
    const stepValidation = validateCurrentStep();
    if (stepValidation) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    setCurrentStep(currentStep - 1);
  };

  const validateCurrentStep = (): boolean => {
    if (currentStep === 1) {
      const step1Errors = form.validate();
      const step1Fields = [
        'legalName',
        'kvkNumber',
        'companyAddress',
        'postalCode',
        'city',
        'country',
      ];
      return !step1Fields.some((field) => step1Errors.errors[field]);
    }
    if (currentStep === 2) {
      const step2Errors = form.validate();
      const step2Fields = ['contactName', 'contactEmail', 'contactPhone', 'jobTitle'];
      return !step2Fields.some((field) => step2Errors.errors[field]);
    }
    return true;
  };

  const isStep1Valid = () => {
    const { legalName, kvkNumber, companyAddress, postalCode, city } = form.values;
    return legalName && kvkNumber && companyAddress && postalCode && city;
  };

  const isStep2Valid = () => {
    const { contactName, contactEmail, contactPhone, jobTitle } = form.values;
    return contactName && contactEmail && contactPhone && jobTitle;
  };

  const isStep3Valid = () => {
    const { termsAccepted, gdprConsent } = form.values;
    return kvkDocument && termsAccepted && gdprConsent;
  };

  return (
    <div className="registration-form-container">
      <div className="registration-header">
        <h2>Join CTN Network</h2>
        <p>Complete the form below to register your organization as a CTN member</p>

        {/* Progress Indicator */}
        <div className="registration-steps">
          <div className={`step ${currentStep >= 1 ? 'active' : ''}`}>
            <span className="step-number">1</span>
            <span className="step-label">Company Info</span>
          </div>
          <div className={`step ${currentStep >= 2 ? 'active' : ''}`}>
            <span className="step-number">2</span>
            <span className="step-label">Contact Details</span>
          </div>
          <div className={`step ${currentStep >= 3 ? 'active' : ''}`}>
            <span className="step-number">3</span>
            <span className="step-label">Documents & Review</span>
          </div>
        </div>
      </div>

      <form onSubmit={form.onSubmit(handleSubmit)} style={{ width: '100%' }}>
        {/* Step 1: Company Information */}
        {currentStep === 1 && (
          <div className="form-step">
            <h3>Company Information</h3>

            <TextInput
              {...form.getInputProps('legalName')}
              label="Legal Company Name"
              required
              mb="sm"
            />

            <TextInput
              {...form.getInputProps('kvkNumber')}
              label="KvK Number (Chamber of Commerce)"
              description="8-digit Dutch Chamber of Commerce number"
              required
              mb="sm"
            />

            <TextInput
              {...form.getInputProps('lei')}
              label="LEI (Legal Entity Identifier)"
              description="Optional - 20 character LEI code"
              mb="sm"
            />

            <Textarea
              {...form.getInputProps('companyAddress')}
              label="Company Address"
              description="Full registered business address (required for verification)"
              placeholder="Street name and number"
              required
              rows={2}
              mb="sm"
            />

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                marginBottom: '12px',
              }}
            >
              <TextInput
                {...form.getInputProps('postalCode')}
                label="Postal Code"
                placeholder="e.g., 1234 AB"
                required
              />

              <TextInput
                {...form.getInputProps('city')}
                label="City"
                placeholder="e.g., Amsterdam"
                required
              />
            </div>

            <Select {...form.getInputProps('country')} label="Country" data={countries} required />

            <div className="form-actions">
              <Button onClick={onCancel} disabled={loading} variant="default">
                Cancel
              </Button>
              <Button color="blue" onClick={handleNext} disabled={!isStep1Valid()}>
                Next: Contact Details
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Contact Information */}
        {currentStep === 2 && (
          <div className="form-step">
            <h3>Contact Information</h3>
            <p>Primary contact person for your organization</p>

            <TextInput {...form.getInputProps('contactName')} label="Full Name" required mb="sm" />

            <TextInput
              {...form.getInputProps('contactEmail')}
              label="Email Address"
              type="email"
              required
              mb="sm"
            />

            <TextInput
              {...form.getInputProps('contactPhone')}
              label="Phone Number"
              description="Include country code (e.g., +31 20 1234567)"
              required
              mb="sm"
            />

            <TextInput {...form.getInputProps('jobTitle')} label="Job Title" required />

            <div className="form-actions">
              <Button onClick={handlePrevious} disabled={loading} variant="default">
                Previous
              </Button>
              <Button color="blue" onClick={handleNext} disabled={!isStep2Valid()}>
                Next: Documents
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Documents & Review */}
        {currentStep === 3 && (
          <div className="form-step">
            <h3>Documents & Final Review</h3>

            <div className="document-upload-section">
              <Text fw={500} mb="xs">
                KvK Extract (Chamber of Commerce Extract){' '}
                <span style={{ color: 'var(--mantine-color-red-6)' }}>*</span>
              </Text>
              <Text size="sm" c="dimmed" mb="md">
                Upload your official KvK extract. We'll verify your company details automatically.
                Accepted formats: PDF, PNG, JPG (max 10MB)
              </Text>
              <KvKDocumentUpload onFileSelect={setKvkDocument} disabled={loading} />
            </div>

            <div className="review-section">
              <h4>Review Your Information</h4>
              <div className="review-grid">
                <div>
                  <strong>Company:</strong> {form.values.legalName}
                </div>
                <div>
                  <strong>KvK:</strong> {form.values.kvkNumber}
                </div>
                <div>
                  <strong>Contact:</strong> {form.values.contactName}
                </div>
                <div>
                  <strong>Email:</strong> {form.values.contactEmail}
                </div>
              </div>
            </div>

            <div className="legal-section">
              <Checkbox
                {...form.getInputProps('termsAccepted', { type: 'checkbox' })}
                label="I accept the CTN Terms and Conditions"
                required
                mb="sm"
              />

              <Checkbox
                {...form.getInputProps('gdprConsent', { type: 'checkbox' })}
                label="I consent to the processing of my personal data in accordance with GDPR"
                required
              />
            </div>

            <div className="form-actions">
              <Button onClick={handlePrevious} disabled={loading} variant="default">
                Previous
              </Button>
              <Button color="blue" type="submit" disabled={loading || !isStep3Valid()}>
                {loading ? 'Submitting...' : 'Submit Application'}
              </Button>
            </div>
          </div>
        )}
      </form>

      <style>{`
        .registration-form-container {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }

        .registration-header {
          text-align: center;
          margin-bottom: 20px;
        }

        .registration-header h2 {
          margin: 0 0 4px 0;
          color: #333;
          font-size: 24px;
        }

        .registration-header p {
          color: #666;
          margin: 0 0 16px 0;
          font-size: 14px;
        }

        .registration-steps {
          display: flex;
          justify-content: center;
          gap: 32px;
          margin-top: 16px;
        }

        .step {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          opacity: 0.4;
        }

        .step.active {
          opacity: 1;
        }

        .step-number {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: #e0e0e0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 16px;
        }

        .step.active .step-number {
          background: #667eea;
          color: white;
        }

        .step-label {
          font-size: 11px;
          color: #666;
        }

        .form-step {
          background: white;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .form-step h3 {
          margin: 0 0 4px 0;
          color: #333;
          font-size: 18px;
        }

        .form-step > p {
          margin: 0 0 16px 0;
          color: #666;
          font-size: 14px;
        }

        .k-form-field {
          margin-bottom: 20px;
        }

        .document-upload-section {
          margin: 16px 0;
          padding: 16px;
          background: #f9fafb;
          border-radius: 8px;
        }

        .review-section {
          margin: 16px 0;
          padding: 16px;
          background: #f0f4ff;
          border-radius: 8px;
        }

        .review-section h4 {
          margin: 0 0 12px 0;
          color: #333;
          font-size: 16px;
        }

        .review-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          font-size: 13px;
        }

        .legal-section {
          margin: 16px 0;
          padding: 16px;
          background: #fff3cd;
          border-radius: 8px;
        }

        .legal-section .k-form-field {
          margin-bottom: 8px;
        }

        .form-actions {
          display: flex;
          justify-content: space-between;
          margin-top: 20px;
          padding-top: 16px;
          border-top: 1px solid #e0e0e0;
        }

        @media (max-width: 768px) {
          .registration-steps {
            gap: 16px;
          }

          .step-label {
            display: none;
          }

          .review-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};
