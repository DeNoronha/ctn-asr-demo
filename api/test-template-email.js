const { EmailClient } = require('@azure/communication-email');
const { emailTemplateService } = require('./dist/services/emailTemplateService');

const connectionString = process.env.COMMUNICATION_SERVICES_CONNECTION_STRING;
const senderAddress = process.env.EMAIL_SENDER_ADDRESS || 'DoNotReply@azurecomm.net';
const recipientEmail = 'R.deNoronha@scotchwhiskyinternational.com';

console.log('=== Template Rendering Test ===');

(async () => {
  try {
    // Render the template
    const templateData = {
      companyName: 'Scotch Whisky International NV',
      contactName: 'Ramon de Noronha',
      kvkNumber: '88888888',
      applicationDate: '2025-11-03T17:00:00Z',
      portalUrl: 'https://calm-pebble-043b2db03.1.azurestaticapps.net',
      subject: 'Application Registered Successfully'
    };
    
    console.log('Rendering template with data:', JSON.stringify(templateData, null, 2));
    const emailBody = await emailTemplateService.renderTemplate(
      'application-created',
      'en',
      templateData
    );
    
    console.log('✓ Template rendered successfully');
    console.log('Email body length:', emailBody.length);
    console.log('');
    
    // Send email
    const emailClient = new EmailClient(connectionString);
    const emailMessage = {
      senderAddress: senderAddress,
      content: {
        subject: 'Application Registered Successfully',
        html: emailBody
      },
      recipients: {
        to: [{ address: recipientEmail }]
      }
    };
    
    console.log('Sending email with rendered template...');
    console.log('Sender:', senderAddress);
    console.log('Recipient:', recipientEmail);
    console.log('');
    
    const poller = await emailClient.beginSend(emailMessage);
    const result = await poller.pollUntilDone();
    
    console.log('✓ Email sent successfully with template!');
    console.log('Message ID:', result.id);
    console.log('Status:', result.status);
    
  } catch (error) {
    console.error('✗ Failed:');
    console.error('Error message:', error.message);
    console.error('Error code:', error.code || 'N/A');
    console.error('Stack:', error.stack);
  }
})();
