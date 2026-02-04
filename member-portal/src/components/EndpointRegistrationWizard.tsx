import { AsrApiClient } from '@ctn/api-client';
import {
  Alert,
  Badge,
  Button,
  Code,
  Group,
  List,
  Loader,
  Paper,
  Select,
  Stack,
  Stepper,
  Text,
  TextInput,
  Textarea,
  ThemeIcon,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import {
  IconAlertCircle,
  IconCheck,
  IconKey,
  IconLink,
  IconRocket,
} from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import type { Endpoint } from '../types';

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

interface TestResults {
  success: boolean;
  message?: string;
  response_time_ms?: number;
  test_result?: string;
}

export function EndpointRegistrationWizard({
  legalEntityId,
  apiBaseUrl,
  getAccessToken,
  onComplete,
  onCancel,
}: EndpointRegistrationWizardProps) {
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const [endpointId, setEndpointId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<TestResults | null>(null);

  // Initialize API client with retry logic and token management
  const apiClient = useMemo(
    () =>
      new AsrApiClient({
        baseURL: apiBaseUrl,
        getAccessToken,
        retryAttempts: 3,
      }),
    [apiBaseUrl, getAccessToken]
  );

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

  // Step 1: Create endpoint (verification happens in Step 2)
  const handleInitiateRegistration = async () => {
    if (!form.validate().hasErrors) {
      setLoading(true);
      try {
        // Create endpoint using api-client with automatic retry and token management
        const endpoint = (await apiClient.endpoints.initiateRegistration(
          legalEntityId,
          form.values
        )) as unknown as Endpoint;
        setEndpointId(endpoint.legal_entity_endpoint_id);

        notifications.show({
          title: 'Endpoint Created',
          message: 'Now verify ownership by allowing our callback request.',
          color: 'green',
          icon: <IconCheck size={16} />,
        });

        setActive(1);
      } catch (error) {
        console.error('Error initiating registration:', error);
        notifications.show({
          title: 'Error',
          message: error instanceof Error ? error.message : 'Failed to initiate registration',
          color: 'red',
          icon: <IconAlertCircle size={16} />,
        });
      } finally {
        setLoading(false);
      }
    }
  };

  // Step 2: Verify endpoint via callback challenge-response
  const handleVerifyEndpoint = async () => {
    if (!endpointId) return;

    setLoading(true);
    try {
      // Send verification callback to endpoint
      // Backend will POST a challenge to the endpoint URL
      // Endpoint must respond with the challenge value to verify ownership
      const result = await apiClient.endpoints.sendVerificationEmail(endpointId);

      if (result.verified) {
        notifications.show({
          title: 'Endpoint Verified',
          message: 'Your endpoint responded correctly to the verification challenge.',
          color: 'green',
          icon: <IconCheck size={16} />,
        });
        setActive(2);
      } else {
        notifications.show({
          title: 'Verification Failed',
          message: result.error || 'Endpoint did not respond correctly to the challenge.',
          color: 'red',
          icon: <IconAlertCircle size={16} />,
        });
      }
    } catch (error: any) {
      console.error('Error verifying endpoint:', error);
      const errorMessage = error?.response?.data?.error || error?.message || 'Failed to verify endpoint';
      const hint = error?.response?.data?.hint;

      notifications.show({
        title: 'Verification Failed',
        message: hint ? `${errorMessage}. ${hint}` : errorMessage,
        color: 'red',
        icon: <IconAlertCircle size={16} />,
      });
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Test endpoint
  const handleTestEndpoint = async () => {
    if (!endpointId) return;

    setLoading(true);
    try {
      // Test endpoint using api-client
      const result = await apiClient.endpoints.testEndpoint(endpointId);
      setTestResults(result.test_data);

      notifications.show({
        title: 'Test Successful',
        message: 'Endpoint connection test passed.',
        color: 'green',
        icon: <IconCheck size={16} />,
      });

      setActive(3);
    } catch (error) {
      console.error('Error testing endpoint:', error);
      notifications.show({
        title: 'Test Failed',
        message: error instanceof Error ? error.message : 'Failed to test endpoint',
        color: 'red',
        icon: <IconAlertCircle size={16} />,
      });
    } finally {
      setLoading(false);
    }
  };

  // Step 4: Activate endpoint
  const handleActivateEndpoint = async () => {
    if (!endpointId) return;

    setLoading(true);
    try {
      // Activate endpoint using api-client
      await apiClient.endpoints.activateEndpoint(endpointId);

      notifications.show({
        title: 'Endpoint Activated',
        message: 'Your endpoint is now active and ready to use.',
        color: 'green',
        icon: <IconRocket size={16} />,
      });

      // Move to completion screen instead of closing immediately
      setActive(4);
    } catch (error) {
      console.error('Error activating endpoint:', error);
      notifications.show({
        title: 'Activation Failed',
        message: error instanceof Error ? error.message : 'Failed to activate endpoint',
        color: 'red',
        icon: <IconAlertCircle size={16} />,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper p="md">
      <Stepper active={active} onStepClick={setActive}>
        <Stepper.Step
          label="1. Details"
          description="Endpoint information"
          icon={<IconRocket size={18} />}
        >
          <Stack gap="md" mt="md">
            <Text size="sm" c="dimmed">
              Register a new data endpoint for your organization. This endpoint will be used for
              data exchange with other members.
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
              description="Must be an HTTPS URL"
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
              <Button onClick={handleInitiateRegistration} loading={loading}>
                Continue
              </Button>
            </Group>
          </Stack>
        </Stepper.Step>

        <Stepper.Step
          label="2. Verify"
          description="Endpoint callback"
          icon={<IconLink size={18} />}
        >
          <Stack gap="md" mt="md">
            <Alert icon={<IconLink size={16} />} title="Verify Endpoint Ownership" color="blue">
              We will send a challenge request to your endpoint to verify you control it.
            </Alert>

            <Paper withBorder p="md">
              <Stack gap="xs">
                <Text size="sm" fw={500}>
                  How Callback Verification Works
                </Text>
                <Text size="sm" c="dimmed">
                  When you click "Verify Endpoint", we will:
                </Text>
                <List size="sm" mt="xs">
                  <List.Item
                    icon={
                      <ThemeIcon size={16} radius="xl" color="blue">
                        <IconCheck size={12} />
                      </ThemeIcon>
                    }
                  >
                    Send a POST request to your endpoint with a challenge token
                  </List.Item>
                  <List.Item
                    icon={
                      <ThemeIcon size={16} radius="xl" color="blue">
                        <IconCheck size={12} />
                      </ThemeIcon>
                    }
                  >
                    Your endpoint must respond with the same challenge value
                  </List.Item>
                  <List.Item
                    icon={
                      <ThemeIcon size={16} radius="xl" color="blue">
                        <IconCheck size={12} />
                      </ThemeIcon>
                    }
                  >
                    If the challenge matches, your endpoint is verified
                  </List.Item>
                </List>
              </Stack>
            </Paper>

            <Alert icon={<IconKey size={16} />} title="Required Endpoint Response" color="teal">
              <Text size="sm" mb="xs">
                Your endpoint must respond to POST requests with JSON:
              </Text>
              <Code block>{'{ "challenge": "<received_challenge_value>" }'}</Code>
            </Alert>

            <Group justify="space-between" mt="md">
              <Button variant="default" onClick={() => setActive(0)}>
                Back
              </Button>
              <Button onClick={handleVerifyEndpoint} loading={loading} leftSection={<IconLink size={16} />}>
                Verify Endpoint
              </Button>
            </Group>
          </Stack>
        </Stepper.Step>

        <Stepper.Step label="3. Test" description="Connection test" icon={<IconKey size={18} />}>
          <Stack gap="md" mt="md">
            <Alert icon={<IconCheck size={16} />} title="Endpoint Verified" color="green">
              Your endpoint ownership has been verified. Now let's test the connection.
            </Alert>

            <Paper withBorder p="md">
              <Stack gap="xs">
                <Text size="sm" fw={500}>
                  Connection Test
                </Text>
                <Text size="sm" c="dimmed">
                  We will send a test request to your endpoint to verify it's reachable and
                  responding correctly.
                </Text>
                <List size="sm" mt="xs">
                  <List.Item
                    icon={
                      <ThemeIcon size={16} radius="xl" color="blue">
                        <IconCheck size={12} />
                      </ThemeIcon>
                    }
                  >
                    Verify HTTPS connection
                  </List.Item>
                  <List.Item
                    icon={
                      <ThemeIcon size={16} radius="xl" color="blue">
                        <IconCheck size={12} />
                      </ThemeIcon>
                    }
                  >
                    Check response time
                  </List.Item>
                  <List.Item
                    icon={
                      <ThemeIcon size={16} radius="xl" color="blue">
                        <IconCheck size={12} />
                      </ThemeIcon>
                    }
                  >
                    Validate response format
                  </List.Item>
                </List>
              </Stack>
            </Paper>

            {testResults && (
              <Alert icon={<IconCheck size={16} />} title="Test Results" color="green">
                <Text size="sm">Response time: {testResults.response_time_ms}ms</Text>
                <Text size="sm">Status: {testResults.test_result}</Text>
              </Alert>
            )}

            <Group justify="space-between" mt="md">
              <Button variant="default" onClick={() => setActive(1)}>
                Back
              </Button>
              <Button onClick={handleTestEndpoint} loading={loading}>
                Test Endpoint
              </Button>
            </Group>
          </Stack>
        </Stepper.Step>

        <Stepper.Step label="4. Activate" description="Final step" icon={<IconRocket size={18} />}>
          <Stack gap="md" mt="md">
            <Alert icon={<IconCheck size={16} />} title="Test Successful" color="green">
              Your endpoint passed all tests and is ready to be activated.
            </Alert>

            <Paper withBorder p="md">
              <Stack gap="xs">
                <Text size="sm" fw={500}>
                  Ready for Activation
                </Text>
                <Text size="sm" c="dimmed">
                  Click "Activate Endpoint" below to make this endpoint available for data exchange.
                  Once activated, other members will be able to discover and communicate with this
                  endpoint.
                </Text>
              </Stack>
            </Paper>

            <Group justify="space-between" mt="md">
              <Button variant="default" onClick={() => setActive(2)}>
                Back
              </Button>
              <Button
                onClick={handleActivateEndpoint}
                loading={loading}
                leftSection={<IconRocket size={16} />}
              >
                Activate Endpoint
              </Button>
            </Group>
          </Stack>
        </Stepper.Step>

        <Stepper.Completed>
          <Stack gap="md" mt="md" align="center">
            <ThemeIcon size={60} radius="xl" color="green">
              <IconCheck size={30} />
            </ThemeIcon>
            <Text size="lg" fw={500}>
              Endpoint Activated Successfully!
            </Text>
            <Text size="sm" c="dimmed" ta="center">
              Your endpoint is now active and available for data exchange.
            </Text>
            <Button onClick={onComplete} mt="md">
              Close
            </Button>
          </Stack>
        </Stepper.Completed>
      </Stepper>
    </Paper>
  );
}
