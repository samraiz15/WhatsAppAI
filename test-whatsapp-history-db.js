'use strict';

const assert = require('assert');

const {
  db,
  registerWhatsappMessage,
  claimWhatsappMessage,
  completeWhatsappMessage
} = require('./db');

const id = 'task04-history-db';

try {
  db.prepare('DELETE FROM whatsapp_messages WHERE message_id = ?').run(id);

  const first = registerWhatsappMessage({
    messageId: id,
    remoteJid: '123456@s.whatsapp.net',
    messageType: 'conversation',
    messageText: 'history message',
    messageTimestamp: 1800000000
  });

  assert.strictEqual(first.inserted, true);

  const duplicate = registerWhatsappMessage({
    messageId: id,
    remoteJid: '123456@s.whatsapp.net',
    messageType: 'conversation',
    messageText: 'duplicate history message',
    messageTimestamp: 1800000001
  });

  assert.strictEqual(duplicate.inserted, false);

  const token = claimWhatsappMessage(id);
  assert.ok(token);

  assert.strictEqual(
    completeWhatsappMessage(id, token),
    true
  );

  const row = db.prepare(`
    SELECT
      message_id,
      message_text,
      message_timestamp,
      status
    FROM whatsapp_messages
    WHERE message_id = ?
  `).get(id);

  assert.strictEqual(row.message_id, id);
  assert.strictEqual(row.message_text, 'history message');
  assert.strictEqual(row.message_timestamp, 1800000000);
  assert.strictEqual(row.status, 'processed');

  console.log('TASK 04: PASS - duplicate/history DB behavior');

} finally {
  db.prepare('DELETE FROM whatsapp_messages WHERE message_id = ?').run(id);
  db.close();
}
