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

// First claim succeeds; duplicate claim is rejected.
{
  const messageId = uniqueId('claim');

  registerWhatsappMessage({
    messageId,
    remoteJid: '923001234567@s.whatsapp.net',
    participantJid: '923001234567@s.whatsapp.net',
    fromMe: false,
    messageType: 'conversation',
    messageText: 'hello',
    messageTimestamp: Math.floor(Date.now() / 1000)
  });

  assert.strictEqual(
    claimWhatsappMessage(messageId),
    true,
    'first claim should succeed'
  );

  assert.strictEqual(
    claimWhatsappMessage(messageId),
    false,
    'second claim should be rejected while processing'
  );

  assert.strictEqual(
    completeWhatsappMessage(messageId),
    true,
    'processing message should complete'
  );

  assert.strictEqual(
    claimWhatsappMessage(messageId),
    false,
    'completed message must never be processed again'
  );

  console.log('PASS: duplicate processing claim is blocked');
}

// Failed processing may be retried.
{
  const messageId = uniqueId('retry');

  registerWhatsappMessage({
    messageId,
    remoteJid: '923001234567@s.whatsapp.net',
    participantJid: '923001234567@s.whatsapp.net',
    fromMe: false,
    messageType: 'conversation',
    messageText: 'retry me',
    messageTimestamp: Math.floor(Date.now() / 1000)
  });

  assert.strictEqual(
    claimWhatsappMessage(messageId),
    true
  );

  assert.strictEqual(
    failWhatsappMessage(messageId, 'simulated processing failure'),
    true
  );

  assert.strictEqual(
    claimWhatsappMessage(messageId),
    true,
    'failed message should be retryable'
  );

  assert.strictEqual(
    completeWhatsappMessage(messageId),
    true
  );

  console.log('PASS: failed processing can be retried');
}

console.log('MESSAGE CLAIM TESTS: 100% PASSED');
