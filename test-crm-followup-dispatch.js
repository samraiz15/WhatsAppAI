'use strict';

const assert = require('assert');
const { dispatchFollowUps } = require('./crm_followup_dispatch');

const sent = [];

async function fakeSendMessage(phone, message) {
  sent.push({ phone, message });
  return { ok: true };
}

(async () => {
  const results = await dispatchFollowUps([
    {
      phone: '+923001234567',
      name: 'Ahmed',
      interest: 'House',
      followup_days: 0
    },
    {
      phone: '+923007654321',
      name: 'Sara',
      interest: 'Plot',
      followup_days: 5
    },
    {
      phone: '+923009999999',
      name: 'Completed',
      interest: 'House',
      followup_days: 0,
      followup_status: 'completed'
    }
  ], fakeSendMessage, new Date());

  assert.strictEqual(results.length, 1);
  assert.strictEqual(sent.length, 1);
  assert.strictEqual(sent[0].phone, '+923001234567');
  assert.ok(sent[0].message.includes('Ahmed'));
  assert.ok(sent[0].message.includes('House'));
  assert.strictEqual(results[0].sent, true);
  assert.deepStrictEqual(results[0].result, { ok: true });

  await assert.rejects(
    () => dispatchFollowUps([], null),
    /sendMessage must be a function/
  );

  console.log('CRM FOLLOW-UP DISPATCH TESTS: 100% PASSED');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
