const { EmailClient } = require('@azure/communication-email');

// Configuration (replace with actual values from Azure)
const connectionString = process.env.COMMUNICATION_SERVICES_CONNECTION_STRING || 'YOUR_CONNECTION_STRING';
const senderAddress = process.env.EMAIL_SENDER_ADDRESS || 'DoNotReply@azurecomm.net';
const recipientEmail = 'R.deNoronha@scotchwhiskyinternational.com';

console.log('=== Azure Communication Services Direct Test ===');
console.log('Sender:', senderAddress);
console.log('Sender length:', senderAddress.length);
console.log('Recipient:', recipientEmail);
console.log('Recipient length:', recipientEmail.length);
console.log('');

const emailClient = new EmailClient(connectionString);

const emailMessage = {
  senderAddress: senderAddress,
  content: {
    subject: 'Direct Test - Email Format Debugging',
    html: '<h1>Test Email</h1><p>This is a direct test to debug email format issues.</p>'
  },
  recipients: {
    to: [{ address: recipientEmail }]
  }
};

console.log('Email message structure:');
console.log(JSON.stringify(emailMessage, null, 2));
console.log('');

(async () => {
  try {
    console.log('Calling emailClient.beginSend...');
    const poller = await emailClient.beginSend(emailMessage);
    console.log('Poller created, waiting for completion...');
    const result = await poller.pollUntilDone();
    console.log('✓ Email sent successfully!');
    console.log('Message ID:', result.id);
    console.log('Status:', result.status);
  } catch (error) {
    console.error('✗ Failed to send email');
    console.error('Error message:', error.message);
    console.error('Error code:', error.code || 'N/A');
    console.error('Full error:', error);
  }
})();
