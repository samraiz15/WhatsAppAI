'use strict';

const assert = require('assert');
const {
  canSendOutboundDm,
  sendOutboundMessage
} = require('./outbound-guard');

const CONNECTED = 'CONNECTED';

(async () => {

function makeSock() {
  const calls = [];

  return {
    calls,
    async sendMessage(jid, content) {
      calls.push({ jid, content });
      return { ok: true };
    }
  };
}

// Unknown customer must be blocked.
{
  const sock = makeSock();
  const authorized = new Set();

  await sendOutboundMessage(
    sock,
    '923001111111@s.whatsapp.net',
    { text: 'hello' },
    {
      authorizedJids: authorized,
      connectionState: CONNECTED,
      connectedState: CONNECTED
    }
  ).then(
    () => assert.fail('unauthorized DM must be blocked'),
    error => {
      assert.match(error.message, /OUTBOUND DM BLOCKED/);
    }
  );

  assert.strictEqual(sock.calls.length, 0);
  console.log('PASS: unknown customer cannot receive outbound DM');
}

// Authorized inbound customer may receive a reply.
{
  const sock = makeSock();
  const authorized = new Set([
    '923002222222@s.whatsapp.net'
  ]);

  await sendOutboundMessage(
    sock,
    '923002222222@s.whatsapp.net',
    { text: 'reply' },
    {
      authorizedJids: authorized,
      connectionState: CONNECTED,
      connectedState: CONNECTED
    }
  );

  assert.strictEqual(sock.calls.length, 1);
  assert.strictEqual(
    sock.calls[0].jid,
    '923002222222@s.whatsapp.net'
  );

  console.log('PASS: authorized inbound customer can receive reply');
}

// Authorization must fail when disconnected.
{
  const sock = makeSock();
  const authorized = new Set([
    '923003333333@s.whatsapp.net'
  ]);

  await sendOutboundMessage(
    sock,
    '923003333333@s.whatsapp.net',
    { text: 'reply' },
    {
      authorizedJids: authorized,
      connectionState: 'DISCONNECTED',
      connectedState: CONNECTED
    }
  ).then(
    () => assert.fail('DM must be blocked while disconnected'),
    error => {
      assert.match(error.message, /OUTBOUND DM BLOCKED/);
    }
  );

  assert.strictEqual(sock.calls.length, 0);
  console.log('PASS: disconnected state blocks outbound DM');
}

// Authorization is JID-specific.
{
  const authorized = new Set([
    '923004444444@s.whatsapp.net'
  ]);

  assert.strictEqual(
    canSendOutboundDm(
      '923004444444@s.whatsapp.net',
      authorized,
      CONNECTED,
      CONNECTED
    ),
    true
  );

  assert.strictEqual(
    canSendOutboundDm(
      '923005555555@s.whatsapp.net',
      authorized,
      CONNECTED,
      CONNECTED
    ),
    false
  );

  console.log('PASS: outbound authorization is tied to correct JID');
}

// Authorization must not be inferred from a DB/contact object.
{
  const sock = makeSock();

  await sendOutboundMessage(
    sock,
    '923006666666@s.whatsapp.net',
    { text: 'reply' },
    {
      authorizedJids: new Set(),
      connectionState: CONNECTED,
      connectedState: CONNECTED
    }
  ).then(
    () => assert.fail('DB/contact existence must not authorize DM'),
    error => {
      assert.match(error.message, /OUTBOUND DM BLOCKED/);
    }
  );

  assert.strictEqual(sock.calls.length, 0);
  console.log('PASS: DB/contact existence cannot authorize outbound DM');
}

console.log('OUTBOUND GUARD TESTS: 100% PASSED');

})().catch(error => {
  console.error(error);
  process.exit(1);
});
