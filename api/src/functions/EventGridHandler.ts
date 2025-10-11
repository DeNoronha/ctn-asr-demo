/**
 * Event Grid Handler Function
 * Receives events from Event Grid and sends email notifications via Communication Services
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { EmailClient } from "@azure/communication-email";

// Email templates for different event types
const EMAIL_TEMPLATES = {
  'Member.Application.Created': {
    subject: 'New Membership Application Received',
    getBody: (data: any) => `
      <h2>New Membership Application</h2>
      <p>A new membership application has been submitted:</p>
      <ul>
        <li><strong>Organization:</strong> ${data.organizationName}</li>
        <li><strong>KvK Number:</strong> ${data.kvkNumber}</li>
        <li><strong>Contact:</strong> ${data.contactName} (${data.contactEmail})</li>
      </ul>
      <p>Please review and approve this application in the Admin Portal.</p>
    `
  },
  'Member.Activated': {
    subject: 'Welcome to CTN - Membership Approved',
    getBody: (data: any) => `
      <h2>Welcome to CTN!</h2>
      <p>Dear ${data.contactName},</p>
      <p>We are pleased to inform you that your membership application has been approved.</p>
      <p><strong>Organization:</strong> ${data.organizationName}</p>
      <p>You can now access the Member Portal and start using CTN services.</p>
      <p>Best regards,<br>CTN Team</p>
    `
  },
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
  },
  'Token.Issued': {
    subject: 'New BVAD Token Issued',
    getBody: (data: any) => `
      <h2>BVAD Token Issued</h2>
      <p>Dear ${data.contactName},</p>
      <p>A new BVAD token has been issued for your organization.</p>
      <p><strong>Organization:</strong> ${data.organizationName}</p>
      <p><strong>Token:</strong> ${data.token}</p>
      <p>Please keep this token secure and do not share it.</p>
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
      
      const template = EMAIL_TEMPLATES[event.eventType];
      if (!template) {
        context.log(`No template found for event type: ${event.eventType}`);
        continue;
      }

      const data = event.data;
      const recipientEmail = data.recipientEmail || data.contactEmail;

      if (!recipientEmail) {
        context.log(`No recipient email found for event: ${event.id}`);
        continue;
      }

      // Send email
      const emailMessage = {
        senderAddress: senderAddress,
        content: {
          subject: template.subject,
          html: template.getBody(data)
        },
        recipients: {
          to: [{ address: recipientEmail }]
        }
      };

      context.log(`Sending email to: ${recipientEmail}`);
      const poller = await emailClient.beginSend(emailMessage);
      const result = await poller.pollUntilDone();
      
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
  handler: EventGridHandler
});
