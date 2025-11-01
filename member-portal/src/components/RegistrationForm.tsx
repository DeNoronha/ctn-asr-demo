/**
 * Member Registration Form Component
 * Self-service registration for new CTN members
 */

import React, { useState } from 'react';
import { Button } from '@mantine/core';

import { Form, Field, FormElement, FieldWrapper } from '@progress/kendo-react-form';


import { Label, Error, Hint } from '@progress/kendo-react-labels';
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

  // Membership
  membershipType: string;

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

const membershipTypes = [
  { label: 'Basic - Free tier (Read-only API access)', value: 'basic' },
  { label: 'Standard - €500/month (Full API access)', value: 'standard' },
  { label: 'Premium - €1000/month (Full API + Priority support)', value: 'premium' },
  { label: 'Enterprise - Custom pricing (Dedicated resources)', value: 'enterprise' },
];

const countries = [
  'Netherlands',
  'Belgium',
  'Germany',
  'France',
  'United Kingdom',
  'Other',
];

// Validators
const requiredValidator = (value: any) =>
  value ? '' : 'This field is required';

const emailValidator = (value: string) => {
  if (!value) return 'Email is required';
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value) ? '' : 'Invalid email address';
};

const kvkValidator = (value: string) => {
  if (!value) return 'KvK number is required';
  // Dutch KvK number is 8 digits
  const kvkRegex = /^\d{8}$/;
  return kvkRegex.test(value) ? '' : 'KvK number must be 8 digits';
};

const phoneValidator = (value: string) => {
  if (!value) return 'Phone number is required';
  const phoneRegex = /^[\d\s\+\-\(\)]+$/;
  return phoneRegex.test(value) ? '' : 'Invalid phone number format';
};

const leiValidator = (value: string) => {
  if (!value) return ''; // LEI is optional
  // LEI is 20 characters
  const leiRegex = /^[A-Z0-9]{20}$/;
  return leiRegex.test(value) ? '' : 'LEI must be 20 alphanumeric characters';
};

export const RegistrationForm: React.FC<RegistrationFormProps> = ({
  onSubmit,
  onCancel,
  loading = false,
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [kvkDocument, setKvkDocument] = useState<File | null>(null);

  const handleSubmit = async (dataItem: { [name: string]: any }) => {
    const formData: RegistrationFormData = {
      legalName: dataItem.legalName,
      kvkNumber: dataItem.kvkNumber,
      lei: dataItem.lei,
      companyAddress: dataItem.companyAddress,
      postalCode: dataItem.postalCode,
      city: dataItem.city,
      country: dataItem.country,
      contactName: dataItem.contactName,
      contactEmail: dataItem.contactEmail,
      contactPhone: dataItem.contactPhone,
      jobTitle: dataItem.jobTitle,
      membershipType: dataItem.membershipType,
      kvkDocument: kvkDocument || undefined,
      termsAccepted: dataItem.termsAccepted,
      gdprConsent: dataItem.gdprConsent,
    };

    await onSubmit(formData);
  };

  const handleNext = () => {
    setCurrentStep(currentStep + 1);
  };

  const handlePrevious = () => {
    setCurrentStep(currentStep - 1);
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

      <Form
        onSubmit={handleSubmit}
        initialValues={{
          membershipType: 'basic',
          country: 'Netherlands',
          termsAccepted: false,
          gdprConsent: false,
        }}
        render={(formRenderProps) => (
          <FormElement style={{ width: '100%' }}>
            {/* Step 1: Company Information */}
            {currentStep === 1 && (
              <div className="form-step">
                <h3>Company Information</h3>

                <Field
                  name="legalName"
                  component={Input}
                  label="Legal Company Name *"
                  validator={requiredValidator}
                />

                <Field
                  name="kvkNumber"
                  component={Input}
                  label="KvK Number (Chamber of Commerce) *"
                  validator={kvkValidator}
                  hint="8-digit Dutch Chamber of Commerce number"
                />

                <Field
                  name="lei"
                  component={Input}
                  label="LEI (Legal Entity Identifier)"
                  validator={leiValidator}
                  hint="Optional - 20 character LEI code"
                />

                <Field
                  name="companyAddress"
                  component={TextArea}
                  label="Company Address *"
                  validator={requiredValidator}
                  rows={3}
                />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <Field
                    name="postalCode"
                    component={Input}
                    label="Postal Code *"
                    validator={requiredValidator}
                  />

                  <Field
                    name="city"
                    component={Input}
                    label="City *"
                    validator={requiredValidator}
                  />
                </div>

                <Field
                  name="country"
                  component={DropDownList}
                  label="Country *"
                  data={countries}
                  validator={requiredValidator}
                />

                <Field
                  name="membershipType"
                  component={DropDownList}
                  label="Membership Type *"
                  data={membershipTypes}
                  textField="label"
                  dataItemKey="value"
                  validator={requiredValidator}
                />

                <div className="form-actions">
                  <Button onClick={onCancel} disabled={loading}>
                    Cancel
                  </Button>
                  <Button
                    color="blue"
                    onClick={handleNext}
                    disabled={
                      !formRenderProps.valueGetter('legalName') ||
                      !formRenderProps.valueGetter('kvkNumber') ||
                      !formRenderProps.valueGetter('companyAddress') ||
                      !formRenderProps.valueGetter('postalCode') ||
                      !formRenderProps.valueGetter('city')
                    }
                  >
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

                <Field
                  name="contactName"
                  component={Input}
                  label="Full Name *"
                  validator={requiredValidator}
                />

                <Field
                  name="contactEmail"
                  component={Input}
                  label="Email Address *"
                  validator={emailValidator}
                  type="email"
                />

                <Field
                  name="contactPhone"
                  component={Input}
                  label="Phone Number *"
                  validator={phoneValidator}
                  hint="Include country code (e.g., +31 20 1234567)"
                />

                <Field
                  name="jobTitle"
                  component={Input}
                  label="Job Title *"
                  validator={requiredValidator}
                />

                <div className="form-actions">
                  <Button onClick={handlePrevious} disabled={loading}>
                    Previous
                  </Button>
                  <Button
                    color="blue"
                    onClick={handleNext}
                    disabled={
                      !formRenderProps.valueGetter('contactName') ||
                      !formRenderProps.valueGetter('contactEmail') ||
                      !formRenderProps.valueGetter('contactPhone') ||
                      !formRenderProps.valueGetter('jobTitle')
                    }
                  >
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
                  <Label>KvK Extract (Chamber of Commerce Extract) *</Label>
                  <Hint>
                    Upload your official KvK extract. We'll verify your company details automatically.
                    Accepted formats: PDF, PNG, JPG (max 10MB)
                  </Hint>
                  <KvKDocumentUpload
                    onFileSelect={setKvkDocument}
                    disabled={loading}
                  />
                </div>

                <div className="review-section">
                  <h4>Review Your Information</h4>
                  <div className="review-grid">
                    <div>
                      <strong>Company:</strong> {formRenderProps.valueGetter('legalName')}
                    </div>
                    <div>
                      <strong>KvK:</strong> {formRenderProps.valueGetter('kvkNumber')}
                    </div>
                    <div>
                      <strong>Contact:</strong> {formRenderProps.valueGetter('contactName')}
                    </div>
                    <div>
                      <strong>Email:</strong> {formRenderProps.valueGetter('contactEmail')}
                    </div>
                    <div>
                      <strong>Membership:</strong>{' '}
                      {membershipTypes.find(
                        (m) => m.value === formRenderProps.valueGetter('membershipType')
                      )?.label}
                    </div>
                  </div>
                </div>

                <div className="legal-section">
                  <Field
                    name="termsAccepted"
                    component={Checkbox}
                    label="I accept the CTN Terms and Conditions *"
                    validator={(value) => (value ? '' : 'You must accept the terms')}
                  />

                  <Field
                    name="gdprConsent"
                    component={Checkbox}
                    label="I consent to the processing of my personal data in accordance with GDPR *"
                    validator={(value) => (value ? '' : 'GDPR consent is required')}
                  />
                </div>

                <div className="form-actions">
                  <Button onClick={handlePrevious} disabled={loading}>
                    Previous
                  </Button>
                  <Button
                    color="blue"
                    type="submit"
                    disabled={
                      loading ||
                      !kvkDocument ||
                      !formRenderProps.valueGetter('termsAccepted') ||
                      !formRenderProps.valueGetter('gdprConsent')
                    }
                  >
                    {loading ? 'Submitting...' : 'Submit Application'}
                  </Button>
                </div>
              </div>
            )}
          </FormElement>
        )}
      />

      <style>{`
        .registration-form-container {
          max-width: 800px;
          margin: 0 auto;
          padding: 32px;
        }

        .registration-header {
          text-align: center;
          margin-bottom: 32px;
        }

        .registration-header h2 {
          margin: 0 0 8px 0;
          color: #333;
        }

        .registration-header p {
          color: #666;
          margin: 0 0 24px 0;
        }

        .registration-steps {
          display: flex;
          justify-content: center;
          gap: 48px;
          margin-top: 24px;
        }

        .step {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          opacity: 0.4;
        }

        .step.active {
          opacity: 1;
        }

        .step-number {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: #e0e0e0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 18px;
        }

        .step.active .step-number {
          background: #667eea;
          color: white;
        }

        .step-label {
          font-size: 12px;
          color: #666;
        }

        .form-step {
          background: white;
          padding: 32px;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .form-step h3 {
          margin: 0 0 8px 0;
          color: #333;
        }

        .form-step > p {
          margin: 0 0 24px 0;
          color: #666;
        }

        .k-form-field {
          margin-bottom: 20px;
        }

        .document-upload-section {
          margin: 24px 0;
          padding: 20px;
          background: #f9fafb;
          border-radius: 8px;
        }

        .review-section {
          margin: 24px 0;
          padding: 20px;
          background: #f0f4ff;
          border-radius: 8px;
        }

        .review-section h4 {
          margin: 0 0 16px 0;
          color: #333;
        }

        .review-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          font-size: 14px;
        }

        .legal-section {
          margin: 24px 0;
          padding: 20px;
          background: #fff3cd;
          border-radius: 8px;
        }

        .legal-section .k-form-field {
          margin-bottom: 12px;
        }

        .form-actions {
          display: flex;
          justify-content: space-between;
          margin-top: 32px;
          padding-top: 20px;
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
