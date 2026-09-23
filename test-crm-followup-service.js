'use strict';

const assert = require('assert');
const { processFollowUps } = require('./crm_followup_service');

(async () => {
  const now = new Date('2026-09-23T16:00:00Z');
  const sent = [];

  async function fakeSendMessage(phone, message) {
    sent.push({ phone, message });
    return { ok: true };
  }

  const leads = [
    {
      id: 1,
      phone: '+923001111111',
      name: 'Ahmed',
      interest: 'House',
      budget: '2 crore',
      area: 'DHA Lahore',
      followup_days: 1,
      followup_started_at: '2026-09-22T16:00:00Z'
    },
    {
      id: 2,
      phone: '+923002222222',
      name: 'Ali',
      interest: 'Plot',
      followup_days: 1,
      followup_started_at: '2026-09-23T16:00:00Z'
    }
  ];

  const result = await processFollowUps(leads, fakeSendMessage, now);

  assert.strictEqual(result.due.length, 1);
  assert.strictEqual(result.sent.length, 1);
  assert.strictEqual(result.failed.length, 0);
  assert.strictEqual(sent.length, 1);
  assert.strictEqual(sent[0].phone, '+923001111111');
  assert.ok(sent[0].message.includes('Ahmed'));
  assert.ok(sent[0].message.includes('House'));

  await assert.rejects(
    () => processFollowUps(leads, null, now),
    /sendMessage must be a function/
  );

  console.log('CRM FOLLOW-UP SERVICE TESTS: 100% PASSED');
})();
