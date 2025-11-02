# Kendo Form to @mantine/form Migration Guide

**Created:** November 2, 2025
**Status:** Blocking builds in 2 portals (admin, member)

---

## Files Requiring Kendo Form Migration

### 1. member-portal/src/components/RegistrationForm.tsx (537 lines) ⚠️ HIGH PRIORITY
**Complexity:** VERY HIGH - Multi-step wizard form
**Current Status:** Blocking member-portal build (14 TypeScript errors)

**Structure:**
- 3-step wizard (Company Info → Contact Details → Documents & Review)
- 14 form fields with custom validators
- Document upload integration (KvKDocumentUpload)
- Progress indicator
- Conditional rendering based on current step

**Migration Steps:**
```tsx
// BEFORE (Kendo Form):
<Form
  onSubmit={handleSubmit}
  initialValues={{...}}
  render={(formRenderProps) => (
    <FormElement>
      <Field name="legalName" component={Input} label="..." validator={...} />
      <Field name="kvkNumber" component={Input} label="..." validator={...} />
    </FormElement>
  )}
/>

// AFTER (@mantine/form):
import { useForm } from '@mantine/form';
import { TextInput, Select, Checkbox } from '@mantine/core';

const form = useForm({
  initialValues: {
    legalName: '',
    kvkNumber: '',
    // ... all fields
  },
  validate: {
    legalName: (value) => !value ? 'This field is required' : null,
    kvkNumber: (value) => {
      if (!value) return 'KvK number is required';
      return /^\d{8}$/.test(value) ? null : 'KvK number must be 8 digits';
    },
    // ... all validators
  },
});

<form onSubmit={form.onSubmit(handleSubmit)}>
  <TextInput
    {...form.getInputProps('legalName')}
    label="Legal Company Name *"
    required
  />
  <TextInput
    {...form.getInputProps('kvkNumber')}
    label="KvK Number *"
    required
  />
  <Button type="submit">Submit</Button>
</form>
```

**Fields to migrate:**
1. `legalName` (TextInput, required)
2. `kvkNumber` (TextInput, kvkValidator)
3. `lei` (TextInput, optional, leiValidator)
4. `companyAddress` (TextInput, required)
5. `postalCode` (TextInput, required)
6. `city` (TextInput, required)
7. `country` (Select, required, countries array)
8. `contactName` (TextInput, required)
9. `contactEmail` (TextInput, emailValidator)
10. `contactPhone` (TextInput, phoneValidator)
11. `jobTitle` (TextInput, required)
12. `membershipType` (Select, required, membershipTypes array)
13. `termsAccepted` (Checkbox, required)
14. `gdprConsent` (Checkbox, required)

**Multi-step logic:**
- Keep `currentStep` state
- Validate current step before allowing next
- Submit only on final step

**Estimated Effort:** 3-4 hours

---

### 2. admin-portal/src/components/CompanyForm.tsx
**Complexity:** HIGH
**Current Status:** Blocking admin-portal build (9 TypeScript errors)

**Fields:**
- Company name, address, registration details
- Identifier management (add/edit/delete identifiers)
- Country selection with COUNTRY_CODES mapping

**Estimated Effort:** 2-3 hours

---

### 3. admin-portal/src/components/ContactForm.tsx
**Complexity:** MEDIUM
**Current Status:** Blocking admin-portal build (8 TypeScript errors)

**Fields:**
- Contact name, email, phone, job title
- Primary contact checkbox
- Active status

**Estimated Effort:** 1-2 hours

---

## Migration Pattern

### 1. Replace Kendo Form imports:
```tsx
// Remove:
import { Form, Field, FormElement, FieldWrapper } from '@progress/kendo-react-form';

// Add:
import { useForm } from '@mantine/form';
import { TextInput, Select, Checkbox, Textarea, Button } from '@mantine/core';
```

### 2. Convert validators:
```tsx
// Kendo validator returns error message string or empty string:
const requiredValidator = (value: any) => value ? '' : 'Required';

// Mantine validator returns error message or null:
const validate = {
  fieldName: (value) => !value ? 'Required' : null,
};
```

### 3. Replace render prop pattern:
```tsx
// Kendo (render prop):
<Form
  onSubmit={handleSubmit}
  initialValues={{...}}
  render={(formRenderProps) => (
    <FormElement>
      <Field name="fieldName" component={Input} />
    </FormElement>
  )}
/>

// Mantine (hook-based):
const form = useForm({ initialValues: {...}, validate: {...} });

<form onSubmit={form.onSubmit(handleSubmit)}>
  <TextInput {...form.getInputProps('fieldName')} />
</form>
```

### 4. Replace Field components:
```tsx
// Kendo Field:
<Field name="email" component={Input} label="Email" validator={emailValidator} />

// Mantine TextInput:
<TextInput
  {...form.getInputProps('email')}
  label="Email"
  required
/>
```

### 5. Handle Select data format:
```tsx
// Kendo DropDownList:
<Field
  name="country"
  component={DropDownList}
  textField="name"
  dataItemKey="code"
  data={COUNTRY_CODES}
/>

// Mantine Select:
<Select
  {...form.getInputProps('country')}
  data={COUNTRY_CODES.map(c => ({ value: c.code, label: c.name }))}
/>
```

---

## Testing Checklist

After migrating each form:
- [ ] All fields render correctly
- [ ] Validation works on blur and submit
- [ ] Error messages display properly
- [ ] Form submission works
- [ ] Required field indicators show
- [ ] Multi-step logic works (if applicable)
- [ ] TypeScript errors resolved
- [ ] Build passes
- [ ] Manual testing in browser

---

## Priority Order

1. **RegistrationForm** (member-portal) - Blocks member-portal build
2. **CompanyForm** (admin-portal) - Blocks admin-portal build
3. **ContactForm** (admin-portal) - Blocks admin-portal build

---

## Resources

- [Mantine Form Documentation](https://mantine.dev/form/use-form/)
- [Mantine Form Validation](https://mantine.dev/form/validation/)
- [Mantine Form Examples](https://mantine.dev/form/recipes/)
