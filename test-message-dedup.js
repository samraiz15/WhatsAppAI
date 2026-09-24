'use strict';

const assert = require('assert');

const {
  registerWhatsappMessage,
  claimWhatsappMessage,
  completeWhatsappMessage,
  db
} = require('./db');

const { classify } = require('./ingestPolicy');

function testDuplicateRegistration() {
  const messageId = `dedup-${Date.now()}-${Math.random()}`;

  const first = registerWhatsappMessage({
    messageId,
    remoteJid: '923001234567@s.whatsapp.net',
    participantJid: '923001234567@s.whatsapp.net',
    fromMe: false,
    messageType: 'conversation',
    messageText: 'hello',
    messageTimestamp: Math.floor(Date.now() / 1000)
  });

  assert.strictEqual(first.inserted, true);
  assert.ok(first.message);

  const second = registerWhatsappMessage({
    messageId,
    remoteJid: '923001234567@s.whatsapp.net',
    participantJid: '923001234567@s.whatsapp.net',
    fromMe: false,
    messageType: 'conversation',
    messageText: 'hello again',
    messageTimestamp: Math.floor(Date.now() / 1000)
  });

  assert.strictEqual(
    second.inserted,
    false,
    'duplicate message ID must not create another row'
  );

  assert.strictEqual(
    claimWhatsappMessage(messageId),
    true,
    'first claim should succeed'
  );

  assert.strictEqual(
    claimWhatsappMessage(messageId),
    false,
    'second claim while processing must fail'
  );

  assert.strictEqual(
    completeWhatsappMessage(messageId),
    true,
    'processing message should complete'
  );

  const rows = db.prepare(`
    SELECT COUNT(*) AS count
    FROM whatsapp_messages
    WHERE message_id = ?
  `).get(messageId);

  assert.strictEqual(rows.count, 1);

  console.log('PASS: duplicate message ID is deduplicated');
}

function testHistoryAppendDoesNotReply() {
  const now = Math.floor(Date.now() / 1000);

  const policy = classify({
    ts: now - 700,
    upsertType: 'append',
    fromMe: false,
    isGroup: false,
    text: 'old message'
  }, now);

  assert.strictEqual(policy.ingest, false);
  assert.strictEqual(policy.reply, false);
  assert.strictEqual(policy.reason, 'append_history');

  console.log('PASS: old append message is treated as history');
}

function testLiveAppendStillProcesses() {
  const now = Math.floor(Date.now() / 1000);

  const policy = classify({
    ts: now - 20,
    upsertType: 'append',
    fromMe: false,
    isGroup: false,
    text: 'recent message'
  }, now);

  assert.strictEqual(policy.ingest, true);
  assert.strictEqual(policy.reply, true);
  assert.strictEqual(policy.reason, 'dm_live');

  console.log('PASS: recent append message remains live');
}

try {
  testDuplicateRegistration();
  testHistoryAppendDoesNotReply();
  testLiveAppendStillProcesses();

  console.log('MESSAGE DEDUP/HISTORY TESTS: 100% PASSED');
} catch (error) {
  console.error('FAIL:', error.message);
  process.exitCode = 1;
}
