import { useState } from 'react';
import {
  Button,
  Group,
  TextInput,
  Textarea,
  Select,
  Paper,
  Text,
  Stack,
  LoadingOverlay,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';

interface EndpointRegistrationWizardProps {
  legalEntityId: string;
  apiBaseUrl: string;
  getAccessToken: () => Promise<string>;
  onComplete: () => void;
  onCancel: () => void;
}

interface EndpointData {
  endpoint_name: string;
  endpoint_url: string;
  endpoint_description: string;
  data_category: string;
  endpoint_type: string;
}

export function EndpointRegistrationWizard({
  legalEntityId,
  apiBaseUrl,
  getAccessToken,
  onComplete,
  onCancel,
}: EndpointRegistrationWizardProps) {
  const [loading, setLoading] = useState(false);

  const form = useForm<EndpointData>({
    initialValues: {
      endpoint_name: '',
      endpoint_url: '',
      endpoint_description: '',
      data_category: 'DATA_EXCHANGE',
      endpoint_type: 'REST_API',
    },
    validate: {
      endpoint_name: (value) => (value.length === 0 ? 'Name is required' : null),
      endpoint_url: (value) => {
        if (value.length === 0) return 'URL is required';
        if (!value.startsWith('https://')) return 'URL must start with https://';
        return null;
      },
    },
  });

  const handleSubmit = async () => {
    if (form.validate().hasErrors) return;

    setLoading(true);
    try {
      const token = await getAccessToken();

      const response = await fetch(`${apiBaseUrl}/entities/${legalEntityId}/endpoints/register`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-CSRF-Token': 'portal-request',
        },
        body: JSON.stringify(form.values),
      });

      if (!response.ok) {
        throw new Error(`Failed to create endpoint: ${response.statusText}`);
      }

      notifications.show({
        title: 'Success',
        message: 'Endpoint registered successfully',
        color: 'green',
      });

      onComplete();
    } catch (error) {
      console.error('Error creating endpoint:', error);
      notifications.show({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to create endpoint',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper p="md" pos="relative">
      <LoadingOverlay visible={loading} />

      <Stack gap="md">
        <Text size="sm" c="dimmed">
          Register a new data endpoint for your organization.
        </Text>

        <TextInput
          label="Endpoint Name"
          placeholder="My API Endpoint"
          required
          {...form.getInputProps('endpoint_name')}
        />

        <TextInput
          label="Endpoint URL"
          placeholder="https://api.example.com/webhook"
          required
          {...form.getInputProps('endpoint_url')}
        />

        <Textarea
          label="Description"
          placeholder="Describe what this endpoint is used for..."
          rows={3}
          {...form.getInputProps('endpoint_description')}
        />

        <Select
          label="Data Category"
          required
          data={[
            { value: 'DATA_EXCHANGE', label: 'Data Exchange' },
            { value: 'NOTIFICATION', label: 'Notification' },
            { value: 'SHIPMENT', label: 'Shipment' },
            { value: 'BOOKING', label: 'Booking' },
          ]}
          {...form.getInputProps('data_category')}
        />

        <Select
          label="Endpoint Type"
          required
          data={[
            { value: 'REST_API', label: 'REST API' },
            { value: 'WEBHOOK', label: 'Webhook' },
            { value: 'SOAP', label: 'SOAP' },
          ]}
          {...form.getInputProps('endpoint_type')}
        />

        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={loading}>
            Register Endpoint
          </Button>
        </Group>
      </Stack>
    </Paper>
  );
}
