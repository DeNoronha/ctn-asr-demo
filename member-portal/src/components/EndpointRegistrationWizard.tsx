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
  IconClock,
  IconKey,
  IconMail,
  IconRocket,
} from '@tabler/icons-react';
import { useMemo, useState } from 'react';

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
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const [endpointId, setEndpointId] = useState<string | null>(null);
  const [verificationToken, setVerificationToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<any>(null);

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

  const tokenForm = useForm({
    initialValues: {
      token: '',
    },
    validate: {
      token: (value) => (value.length === 0 ? 'Token is required' : null),
    },
  });

  // Step 1: Create endpoint and generate token
  const handleInitiateRegistration = async () => {
    if (!form.validate().hasErrors) {
      setLoading(true);
      try {
        // Create endpoint using api-client with automatic retry and token management
        const endpoint = (await apiClient.endpoints.initiateRegistration(
          legalEntityId,
          form.values
        )) as any;
        setEndpointId(endpoint.legal_entity_endpoint_id);

        // Automatically send verification email
        const emailResult = await apiClient.endpoints.sendVerificationEmail(
          endpoint.legal_entity_endpoint_id
        );

        // In mock mode, the token is returned
        if (emailResult.mock && emailResult.token) {
          setVerificationToken(emailResult.token);
          setExpiresAt(emailResult.expires_at || null);
        }

        notifications.show({
          title: 'Registration Initiated',
          message: 'Endpoint created. Verification email sent.',
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

  // Step 2: Verify token
  const handleVerifyToken = async () => {
    if (!tokenForm.validate().hasErrors && endpointId) {
      setLoading(true);
      try {
        // Verify token using api-client
        await apiClient.endpoints.verifyToken(endpointId, {
          token: tokenForm.values.token,
        });

        notifications.show({
          title: 'Email Verified',
          message: 'Your endpoint email has been verified successfully.',
          color: 'green',
          icon: <IconCheck size={16} />,
        });

        setActive(2);
      } catch (error) {
        console.error('Error verifying token:', error);
        notifications.show({
          title: 'Verification Failed',
          message: error instanceof Error ? error.message : 'Failed to verify token',
          color: 'red',
          icon: <IconAlertCircle size={16} />,
        });
      } finally {
        setLoading(false);
      }
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
          description="Email verification"
          icon={<IconMail size={18} />}
        >
          <Stack gap="md" mt="md">
            <Alert icon={<IconMail size={16} />} title="Verification Email Sent" color="blue">
              A verification email has been sent with a token. Please enter the token below.
            </Alert>

            {verificationToken && (
              <Alert icon={<IconKey size={16} />} title="Mock Mode - Token Provided" color="teal">
                <Text size="sm" mb="xs">
                  In development mode, the token is displayed here:
                </Text>
                <Code block>{verificationToken}</Code>
                {expiresAt && (
                  <Group gap="xs" mt="xs">
                    <IconClock size={14} />
                    <Text size="xs" c="dimmed">
                      Expires: {new Date(expiresAt).toLocaleString()}
                    </Text>
                  </Group>
                )}
              </Alert>
            )}

            <TextInput
              label="Verification Token"
              placeholder="Enter the token from the email"
              required
              {...tokenForm.getInputProps('token')}
            />

            <Group justify="space-between" mt="md">
              <Button variant="default" onClick={() => setActive(0)}>
                Back
              </Button>
              <Button onClick={handleVerifyToken} loading={loading}>
                Verify Token
              </Button>
            </Group>
          </Stack>
        </Stepper.Step>

        <Stepper.Step label="3. Test" description="Connection test" icon={<IconKey size={18} />}>
          <Stack gap="md" mt="md">
            <Alert icon={<IconCheck size={16} />} title="Email Verified" color="green">
              Your email has been verified successfully. Now let's test the endpoint connection.
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
