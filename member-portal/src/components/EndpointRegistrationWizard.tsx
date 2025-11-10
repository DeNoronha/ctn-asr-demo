import { useState } from 'react';
import {
  Stepper,
  Button,
  Group,
  TextInput,
  Textarea,
  Select,
  Paper,
  Text,
  Stack,
  Alert,
  Code,
  Loader,
  Badge,
  List,
  ThemeIcon,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import {
  IconCheck,
  IconMail,
  IconKey,
  IconRocket,
  IconAlertCircle,
  IconClock,
} from '@tabler/icons-react';
import { useApiClient } from '../hooks/useApiClient';

interface EndpointRegistrationWizardProps {
  legalEntityId: string;
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
  onComplete,
  onCancel,
}: EndpointRegistrationWizardProps) {
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const [endpointId, setEndpointId] = useState<string | null>(null);
  const [verificationToken, setVerificationToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<any>(null);
  const apiClient = useApiClient();

  const form = useForm<EndpointData>({
    initialValues: {
      endpoint_name: '',
      endpoint_url: '',
      endpoint_description: '',
      data_category: 'DATA_EXCHANGE',
      endpoint_type: 'REST_API',
    },
    validate: (values) => {
      if (active === 0) {
        return {
          endpoint_name:
            values.endpoint_name.length < 3 ? 'Name must be at least 3 characters' : null,
          endpoint_url: !values.endpoint_url.startsWith('https://')
            ? 'URL must use HTTPS protocol'
            : null,
        };
      }
      return {};
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
        const endpoint = await apiClient.endpoints.initiateRegistration(
          legalEntityId,
          form.values
        );
        setEndpointId(endpoint.id);

        // Automatically send verification email
        const emailResult = await apiClient.endpoints.sendVerificationEmail(endpoint.id);

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
      } catch (error: any) {
        notifications.show({
          title: 'Error',
          message: error.message || 'Failed to initiate registration',
          color: 'red',
          icon: <IconAlertCircle size={16} />,
        });
      } finally {
        setLoading(false);
      }
    }
  };

  // Step 3: Verify token
  const handleVerifyToken = async () => {
    if (!tokenForm.validate().hasErrors && endpointId) {
      setLoading(true);
      try {
        await apiClient.endpoints.verifyToken(endpointId, {
          token: tokenForm.values.token,
        });

        notifications.show({
          title: 'Token Verified',
          message: 'Verification successful. Ready to test endpoint.',
          color: 'green',
          icon: <IconCheck size={16} />,
        });

        setActive(2);
      } catch (error: any) {
        notifications.show({
          title: 'Verification Failed',
          message: error.response?.data?.error || 'Invalid or expired token',
          color: 'red',
          icon: <IconAlertCircle size={16} />,
        });
      } finally {
        setLoading(false);
      }
    }
  };

  // Step 4: Test endpoint
  const handleTestEndpoint = async () => {
    if (!endpointId) return;

    setLoading(true);
    try {
      const result = await apiClient.endpoints.testEndpoint(endpointId);
      setTestResults(result.test_data);

      notifications.show({
        title: 'Test Successful',
        message: 'Endpoint test completed successfully.',
        color: 'green',
        icon: <IconCheck size={16} />,
      });

      setActive(3);
    } catch (error: any) {
      notifications.show({
        title: 'Test Failed',
        message: error.message || 'Endpoint test failed',
        color: 'red',
        icon: <IconAlertCircle size={16} />,
      });
    } finally {
      setLoading(false);
    }
  };

  // Step 5: Activate endpoint
  const handleActivate = async () => {
    if (!endpointId) return;

    setLoading(true);
    try {
      await apiClient.endpoints.activateEndpoint(endpointId);

      notifications.show({
        title: 'Endpoint Activated',
        message: 'Endpoint is now active and available in discovery service.',
        color: 'green',
        icon: <IconRocket size={16} />,
      });

      onComplete();
    } catch (error: any) {
      notifications.show({
        title: 'Activation Failed',
        message: error.message || 'Failed to activate endpoint',
        color: 'red',
        icon: <IconAlertCircle size={16} />,
      });
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (active === 0) {
      handleInitiateRegistration();
    } else if (active === 1) {
      handleVerifyToken();
    } else if (active === 2) {
      handleTestEndpoint();
    } else if (active === 3) {
      handleActivate();
    }
  };

  const prevStep = () => setActive((current) => (current > 0 ? current - 1 : current));

  return (
    <Paper shadow="sm" p="xl" radius="md">
      <Stepper active={active} onStepClick={setActive}>
        {/* Step 1: Endpoint Details */}
        <Stepper.Step
          label="Endpoint Details"
          description="Enter endpoint information"
          icon={<IconRocket size={18} />}
        >
          <Stack gap="md" mt="md">
            <Text size="sm" c="dimmed">
              Provide the details of your endpoint that will exchange data with other members.
            </Text>

            <TextInput
              label="Endpoint Name"
              placeholder="Production API Endpoint"
              required
              {...form.getInputProps('endpoint_name')}
            />

            <TextInput
              label="Endpoint URL"
              placeholder="https://api.example.com/v1"
              description="Must use HTTPS protocol"
              required
              {...form.getInputProps('endpoint_url')}
            />

            <Textarea
              label="Description"
              placeholder="Describe what this endpoint is used for..."
              minRows={3}
              {...form.getInputProps('endpoint_description')}
            />

            <Select
              label="Data Category"
              data={[
                { value: 'DATA_EXCHANGE', label: 'Data Exchange' },
                { value: 'REAL_TIME_UPDATES', label: 'Real-Time Updates' },
                { value: 'BATCH_PROCESSING', label: 'Batch Processing' },
                { value: 'NOTIFICATIONS', label: 'Notifications' },
              ]}
              {...form.getInputProps('data_category')}
            />

            <Select
              label="Endpoint Type"
              data={[
                { value: 'REST_API', label: 'REST API' },
                { value: 'GRAPHQL', label: 'GraphQL' },
                { value: 'WEBHOOK', label: 'Webhook' },
                { value: 'GRPC', label: 'gRPC' },
              ]}
              {...form.getInputProps('endpoint_type')}
            />
          </Stack>
        </Stepper.Step>

        {/* Step 2: Email Verification */}
        <Stepper.Step
          label="Email Verification"
          description="Enter verification token"
          icon={<IconMail size={18} />}
        >
          <Stack gap="md" mt="md">
            <Alert icon={<IconMail size={16} />} title="Verification Email Sent" color="blue">
              <Text size="sm">
                A verification token has been sent to your email address. Please enter it below to
                continue.
              </Text>
              {expiresAt && (
                <Text size="xs" c="dimmed" mt="xs">
                  <IconClock size={14} style={{ verticalAlign: 'middle' }} /> Expires:{' '}
                  {new Date(expiresAt).toLocaleString()}
                </Text>
              )}
            </Alert>

            {verificationToken && (
              <Alert
                icon={<IconKey size={16} />}
                title="Development Mode - Token Preview"
                color="yellow"
              >
                <Text size="sm" mb="xs">
                  In production, this token would only be sent via email. For testing:
                </Text>
                <Code block>{verificationToken}</Code>
              </Alert>
            )}

            <TextInput
              label="Verification Token"
              placeholder="Enter the token from your email"
              required
              {...tokenForm.getInputProps('token')}
            />
          </Stack>
        </Stepper.Step>

        {/* Step 3: Test Endpoint */}
        <Stepper.Step
          label="Test Connection"
          description="Verify endpoint works"
          icon={<IconKey size={18} />}
        >
          <Stack gap="md" mt="md">
            <Alert
              icon={<IconAlertCircle size={16} />}
              title="Endpoint Test"
              color="blue"
            >
              <Text size="sm">
                We will now test your endpoint to ensure it's reachable and properly configured. In
                production, this would make a real API call to your endpoint.
              </Text>
            </Alert>

            <Paper withBorder p="md">
              <Stack gap="sm">
                <Group justify="space-between">
                  <Text fw={500}>Endpoint URL:</Text>
                  <Code>{form.values.endpoint_url}</Code>
                </Group>
                <Group justify="space-between">
                  <Text fw={500}>Endpoint Type:</Text>
                  <Badge>{form.values.endpoint_type}</Badge>
                </Group>
                <Group justify="space-between">
                  <Text fw={500}>Status:</Text>
                  <Badge color="yellow">Pending Test</Badge>
                </Group>
              </Stack>
            </Paper>

            {testResults && (
              <Alert icon={<IconCheck size={16} />} title="Test Results" color="green">
                <Stack gap="xs">
                  <Text size="sm">
                    Test completed successfully in {testResults.response_time_ms}ms
                  </Text>
                  <Code block>{JSON.stringify(testResults.mock_response, null, 2)}</Code>
                </Stack>
              </Alert>
            )}
          </Stack>
        </Stepper.Step>

        {/* Step 4: Activation */}
        <Stepper.Step
          label="Activate"
          description="Complete registration"
          icon={<IconRocket size={18} />}
        >
          <Stack gap="md" mt="md">
            <Alert icon={<IconCheck size={16} />} title="Ready to Activate" color="green">
              <Text size="sm">
                Your endpoint has been verified and tested successfully. Click "Activate" to make
                it available in the discovery service for other members.
              </Text>
            </Alert>

            <Paper withBorder p="md">
              <Stack gap="sm">
                <Text fw={700} size="lg">
                  Registration Summary
                </Text>
                <List spacing="xs" size="sm" center>
                  <List.Item
                    icon={
                      <ThemeIcon color="green" size={20} radius="xl">
                        <IconCheck size={12} />
                      </ThemeIcon>
                    }
                  >
                    Endpoint details configured
                  </List.Item>
                  <List.Item
                    icon={
                      <ThemeIcon color="green" size={20} radius="xl">
                        <IconCheck size={12} />
                      </ThemeIcon>
                    }
                  >
                    Email verification completed
                  </List.Item>
                  <List.Item
                    icon={
                      <ThemeIcon color="green" size={20} radius="xl">
                        <IconCheck size={12} />
                      </ThemeIcon>
                    }
                  >
                    Endpoint connectivity tested
                  </List.Item>
                </List>
              </Stack>
            </Paper>

            <Paper withBorder p="md" bg="blue.0">
              <Text fw={500} size="sm">
                Once activated, other members will be able to discover and connect to your endpoint
                through the association's discovery service.
              </Text>
            </Paper>
          </Stack>
        </Stepper.Step>
      </Stepper>

      <Group justify="space-between" mt="xl">
        <Button variant="default" onClick={active === 0 ? onCancel : prevStep}>
          {active === 0 ? 'Cancel' : 'Back'}
        </Button>
        <Button onClick={nextStep} loading={loading}>
          {active === 3 ? 'Activate Endpoint' : 'Next'}
        </Button>
      </Group>
    </Paper>
  );
}
