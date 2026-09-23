'use strict';

const assert = require('assert');
const {
  getFollowUpDueAt,
  isFollowUpDue
} = require('./crm_scheduler');

const start = new Date('2026-09-23T12:00:00Z');

const due = getFollowUpDueAt(
  { followup_days: 2 },
  start
);

assert.strictEqual(
  due.toISOString(),
  '2026-09-25T12:00:00.000Z'
);

assert.strictEqual(
  isFollowUpDue({
    phone: '+923009999999',
    followup_days: 1
  }, new Date('2026-09-24T12:00:00Z')),
  true
);

assert.strictEqual(
  isFollowUpDue({
    phone: '+923009999999',
    followup_days: 1
  }, new Date('2026-09-23T12:00:00Z')),
  false
);

assert.strictEqual(
  isFollowUpDue({
    phone: '+923009999999',
    followup_days: 1,
    followup_status: 'completed'
  }, new Date('2026-09-24T12:00:00Z')),
  false
);

console.log('CRM SCHEDULER TESTS: 100% PASSED');
