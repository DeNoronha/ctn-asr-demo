/**
 * Event Grid Handler Function
 * Receives events from Event Grid and sends email notifications via Communication Services
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { EmailClient } from "@azure/communication-email";
import { emailTemplateService } from "../services/emailTemplateService";
import { withEventGridValidation, validateEventGridSchema } from "../middleware/eventGridValidation";
import { TIMEOUT_CONFIG, withTimeout } from "../utils/timeoutConfig";

// Event type to template mapping
const EVENT_TEMPLATE_MAPPING: Record<string, { templateName: string; subjectKey: string }> = {
  'Member.Application.Created': {
    templateName: 'application-created',
    subjectKey: 'Application Registered Successfully'
  },
  'Member.Activated': {
    templateName: 'application-activated',
    subjectKey: 'Application Activated'
  },
  'Token.Issued': {
    templateName: 'token-issued',
    subjectKey: 'New Access Token Issued'
  }
};

// Fallback templates for events without dedicated templates
const FALLBACK_EMAIL_TEMPLATES = {
  'Member.Suspended': {
    subject: 'CTN Membership Suspended',
    getBody: (data: any) => `
      <h2>Membership Suspended</h2>
      <p>Dear ${data.contactName},</p>
      <p>Your CTN membership has been suspended.</p>
      <p><strong>Reason:</strong> ${data.reason || 'Not specified'}</p>
      <p>Please contact support for more information.</p>
      <p>Best regards,<br>CTN Team</p>
    `
  },
  'Member.Terminated': {
    subject: 'CTN Membership Terminated',
    getBody: (data: any) => `
      <h2>Membership Terminated</h2>
      <p>Dear ${data.contactName},</p>
      <p>Your CTN membership has been terminated.</p>
      <p>Thank you for being part of CTN.</p>
      <p>Best regards,<br>CTN Team</p>
    `
  }
};

export async function EventGridHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log('Event Grid Handler triggered');

  try {
    const body = await request.text();
    const events = JSON.parse(body);

    // Handle validation handshake
    if (events[0]?.eventType === 'Microsoft.EventGrid.SubscriptionValidationEvent') {
      context.log('Handling subscription validation');
      return {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          validationResponse: events[0].data.validationCode
        })
      };
    }

    // Initialize Email Client
    const connectionString = process.env.COMMUNICATION_SERVICES_CONNECTION_STRING;
    if (!connectionString) {
      throw new Error('COMMUNICATION_SERVICES_CONNECTION_STRING not configured');
    }

    const emailClient = new EmailClient(connectionString);
    const senderAddress = process.env.EMAIL_SENDER_ADDRESS || 'DoNotReply@azurecomm.net';

    // Process each event
    for (const event of events) {
      context.log(`Processing event: ${event.eventType}`);

      // Validate event schema
      const schemaValidation = validateEventGridSchema(event);
      if (!schemaValidation.valid) {
        context.error(`Invalid event schema: ${schemaValidation.error}`);
        continue;
      }

      const data = event.data;
      const recipientEmail = data.recipientEmail || data.contactEmail;

      if (!recipientEmail) {
        context.log(`No recipient email found for event: ${event.id}`);
        continue;
      }

      // Get language preference (default to 'en')
      const language = data.language || data.preferredLanguage || 'en';

      let emailSubject: string;
      let emailBody: string;

      // Check if we have a template for this event type
      const templateMapping = EVENT_TEMPLATE_MAPPING[event.eventType];

      if (templateMapping) {
        try {
          // Use the template service for branded multi-language emails
          context.log(`Using template: ${templateMapping.templateName} (${language})`);

          // Prepare template data
          const templateData = {
            companyName: data.organizationName || data.companyName,
            contactName: data.contactName,
            kvkNumber: data.kvkNumber,
            applicationDate: data.applicationDate || data.createdDate,
            activatedDate: data.activatedDate || data.activationDate,
            endpointName: data.endpointName,
            issuedDate: data.issuedDate || data.createdDate,
            expiresDate: data.expiresDate || data.expiryDate,
            portalUrl: process.env.MEMBER_PORTAL_URL || 'https://calm-pebble-0b2ffb603-12.westeurope.5.azurestaticapps.net',
            subject: templateMapping.subjectKey,
            ...data // Include all original data
          };

          emailBody = await emailTemplateService.renderTemplate(
            templateMapping.templateName,
            language,
            templateData
          );
          emailSubject = templateMapping.subjectKey;

        } catch (error) {
          context.error(`Error rendering template ${templateMapping.templateName}:`, error);
          // Fall back to simple email if template rendering fails
          const fallback = FALLBACK_EMAIL_TEMPLATES[event.eventType];
          if (fallback) {
            emailSubject = fallback.subject;
            emailBody = fallback.getBody(data);
          } else {
            context.log(`No template or fallback found for event type: ${event.eventType}`);
            continue;
          }
        }
      } else {
        // Use fallback template for events without dedicated templates
        const fallback = FALLBACK_EMAIL_TEMPLATES[event.eventType];
        if (!fallback) {
          context.log(`No template found for event type: ${event.eventType}`);
          continue;
        }
        emailSubject = fallback.subject;
        emailBody = fallback.getBody(data);
      }

      // Send email
      const emailMessage = {
        senderAddress: senderAddress,
        content: {
          subject: emailSubject,
          html: emailBody
        },
        recipients: {
          to: [{ address: recipientEmail }]
        }
      };

      context.log(`Sending email to: ${recipientEmail}`);

      // Send email with timeout
      const result = await withTimeout(
        (async () => {
          const poller = await emailClient.beginSend(emailMessage);
          return await poller.pollUntilDone();
        })(),
        TIMEOUT_CONFIG.COMMUNICATION_SERVICES_MS,
        `Email sending timeout exceeded (${TIMEOUT_CONFIG.COMMUNICATION_SERVICES_MS / 1000} seconds)`
      );

      context.log(`Email sent successfully. Message ID: ${result.id}`);
    }

    return {
      status: 200,
      body: JSON.stringify({ message: 'Events processed successfully' })
    };

  } catch (error) {
    context.error('Error processing events:', error);
    return {
      status: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
}

app.http('EventGridHandler', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'eventgrid/webhook',
  handler: withEventGridValidation(EventGridHandler)
});
