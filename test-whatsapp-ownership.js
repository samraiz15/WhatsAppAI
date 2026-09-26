'use strict';

const assert = require('assert');

const {
  db,
  registerWhatsappMessage,
  claimWhatsappMessage,
  completeWhatsappMessage,
  failWhatsappMessage
} = require('./db');

const id = 'task03-owner';

try {
  db.prepare('DELETE FROM whatsapp_messages WHERE message_id = ?').run(id);

  registerWhatsappMessage({
    messageId: id,
    messageText: 'ownership race'
  });

  const workerAToken = claimWhatsappMessage(id);
  assert.ok(workerAToken);

  // Simulate worker A becoming stale.
  db.prepare(`
    UPDATE whatsapp_messages
    SET claimed_at = datetime('now', '-6 minutes')
    WHERE message_id = ?
  `).run(id);

  // Worker B reclaims the message.
  const workerBToken = claimWhatsappMessage(id);
  assert.ok(workerBToken);

  // Worker A must NOT be able to complete B's claim.
  // This test should fail with the current message_id-only API.
  assert.strictEqual(
    completeWhatsappMessage(id, workerAToken),
    false
  );

  // Current owner can complete.
  assert.strictEqual(
    completeWhatsappMessage(id, workerBToken),
    true
  );

  const row = db.prepare(`
    SELECT status
    FROM whatsapp_messages
    WHERE message_id = ?
  `).get(id);

  assert.strictEqual(row.status, 'processed');

  console.log('TASK 03: PASS - WhatsApp claim ownership');

} finally {
  db.prepare('DELETE FROM whatsapp_messages WHERE message_id = ?').run(id);
  db.close();
}
