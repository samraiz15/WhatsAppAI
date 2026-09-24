const assert = require('assert');

const {
  registerWhatsappMessage,
  claimWhatsappMessage,
  completeWhatsappMessage,
  failWhatsappMessage
} = require('./db');

function uniqueId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

const messageId = uniqueId('failure');

const registration = registerWhatsappMessage({
  messageId,
  remoteJid: '923001234567@s.whatsapp.net',
  participantJid: '923001234567@s.whatsapp.net',
  fromMe: false,
  messageType: 'conversation',
  messageText: 'failure path',
  messageTimestamp: Math.floor(Date.now() / 1000)
});

assert.strictEqual(
  registration.inserted,
  true,
  'message should be registered'
);

assert.strictEqual(
  claimWhatsappMessage(messageId),
  true,
  'message should be claimed'
);

assert.strictEqual(
  failWhatsappMessage(messageId, 'simulated downstream failure'),
  true,
  'processing failure should mark message failed'
);

assert.strictEqual(
  claimWhatsappMessage(messageId),
  true,
  'failed message must be claimable again'
);

assert.strictEqual(
  completeWhatsappMessage(messageId),
  true,
  'retried message should complete'
);

assert.strictEqual(
  claimWhatsappMessage(messageId),
  false,
  'completed message must not be processed again'
);

console.log('PASS: processing failure returns message to retryable state');
console.log('PASS: successful retry completes message');
console.log('MESSAGE FAILURE TESTS: 100% PASSED');
