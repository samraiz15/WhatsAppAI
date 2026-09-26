'use strict';

const assert = require('assert');

const {
  db,
  registerWhatsappMessage,
  claimWhatsappMessage,
  completeWhatsappMessage,
  failWhatsappMessage
} = require('./db');

function cleanup() {
  db.prepare('DELETE FROM whatsapp_messages WHERE message_id LIKE ?')
    .run('task02-%');
}

try {
  cleanup();

  // 1. First delivery is registered.
  const first = registerWhatsappMessage({
    messageId: 'task02-duplicate',
    remoteJid: '923001234567@s.whatsapp.net',
    messageType: 'conversation',
    messageText: 'hello',
    messageTimestamp: 1800000000
  });

  assert.strictEqual(first.inserted, true);

  // 2. Same WhatsApp event delivered again must not insert another row.
  const duplicate = registerWhatsappMessage({
    messageId: 'task02-duplicate',
    remoteJid: '923001234567@s.whatsapp.net',
    messageType: 'conversation',
    messageText: 'hello again',
    messageTimestamp: 1800000001
  });

  assert.strictEqual(duplicate.inserted, false);

  const rows = db.prepare(`
    SELECT COUNT(*) AS count
    FROM whatsapp_messages
    WHERE message_id = ?
  `).get('task02-duplicate');

  assert.strictEqual(rows.count, 1);

  // 3. First processor claims the message.
  const duplicateToken = claimWhatsappMessage('task02-duplicate');
  assert.ok(duplicateToken);

  // 4. Second processor cannot claim an active message.
  assert.strictEqual(
    claimWhatsappMessage('task02-duplicate'),
    false
  );

  // 5. Completed messages cannot be processed again.
  assert.strictEqual(
    completeWhatsappMessage('task02-duplicate', duplicateToken),
    true
  );

  assert.strictEqual(
    claimWhatsappMessage('task02-duplicate'),
    false
  );

  // 6. Failed messages remain retryable.
  const failed = registerWhatsappMessage({
    messageId: 'task02-failed',
    remoteJid: '923009999999@s.whatsapp.net',
    messageText: 'retry me',
    messageTimestamp: 1800000000
  });

  assert.strictEqual(failed.inserted, true);
  const failedToken = claimWhatsappMessage('task02-failed');
  assert.ok(failedToken);

  assert.strictEqual(
    failWhatsappMessage('task02-failed', 'test failure', failedToken),
    true
  );

  const retryToken = claimWhatsappMessage('task02-failed');
  assert.ok(retryToken);

  assert.strictEqual(
    completeWhatsappMessage('task02-failed', retryToken),
    true
  );

  // 7. Already-completed failed/retried work cannot be claimed again.
  assert.strictEqual(
    claimWhatsappMessage('task02-failed'),
    false
  );

  console.log('TASK 02: PASS - WhatsApp message idempotency lifecycle');

} finally {
  cleanup();
  db.close();
}
