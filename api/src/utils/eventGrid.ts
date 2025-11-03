/**
 * Event Grid Publisher Utility
 * Publishes events to Azure Event Grid for email notifications and event-driven workflows
 */

import { EventGridPublisherClient, AzureKeyCredential } from '@azure/eventgrid';
import { InvocationContext } from '@azure/functions';

export interface EventGridConfig {
  endpoint: string;
  accessKey: string;
}

export interface EventGridEvent {
  id: string;
  eventType: string;
  subject: string;
  dataVersion: string;
  data: any;
}

/**
 * Get Event Grid configuration from environment variables
 */
export function getEventGridConfig(): EventGridConfig | null {
  const endpoint = process.env.EVENT_GRID_ENDPOINT;
  const accessKey = process.env.EVENT_GRID_ACCESS_KEY;

  if (!endpoint || !accessKey) {
    console.warn('Event Grid not configured - missing EVENT_GRID_ENDPOINT or EVENT_GRID_ACCESS_KEY');
    return null;
  }

  return { endpoint, accessKey };
}

/**
 * Publish events to Event Grid
 * @param events Array of events to publish
 * @param context Function invocation context for logging
 * @returns True if successful, false if Event Grid not configured
 */
export async function publishEvents(
  events: EventGridEvent[],
  context?: InvocationContext
): Promise<boolean> {
  const config = getEventGridConfig();

  if (!config) {
    if (context) {
      context.warn('Event Grid not configured - skipping event publishing');
    } else {
      console.warn('Event Grid not configured - skipping event publishing');
    }
    return false;
  }

  try {
    const client = new EventGridPublisherClient(
      config.endpoint,
      'EventGrid',
      new AzureKeyCredential(config.accessKey)
    );

    // Add eventTime to each event
    const eventsWithTime = events.map(event => ({
      ...event,
      eventTime: new Date()
    }));

    await client.send(eventsWithTime);

    if (context) {
      context.log(`Successfully published ${events.length} event(s) to Event Grid`);
    } else {
      console.log(`Successfully published ${events.length} event(s) to Event Grid`);
    }

    return true;
  } catch (error: any) {
    if (context) {
      context.error('Failed to publish events to Event Grid:', error);
    } else {
      console.error('Failed to publish events to Event Grid:', error);
    }
    return false;
  }
}

/**
 * Publish a single event to Event Grid
 * @param event Event to publish
 * @param context Function invocation context for logging
 */
export async function publishEvent(
  event: EventGridEvent,
  context?: InvocationContext
): Promise<boolean> {
  return publishEvents([event], context);
}

/**
 * Create a Member Application Created event
 */
export function createApplicationCreatedEvent(data: {
  applicationId: string;
  applicantEmail: string;
  applicantName: string;
  legalName: string;
  kvkNumber: string;
  membershipType: string;
}): EventGridEvent {
  return {
    id: `application-${data.applicationId}-${Date.now()}`,
    eventType: 'Member.Application.Created',
    subject: `applications/${data.applicationId}`,
    dataVersion: '1.0',
    data: {
      applicationId: data.applicationId,
      recipientEmail: data.applicantEmail,
      contactName: data.applicantName,
      legalName: data.legalName,
      kvkNumber: data.kvkNumber,
      membershipType: data.membershipType,
      submittedAt: new Date().toISOString()
    }
  };
}
