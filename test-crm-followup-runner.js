const assert = require('assert');
const {
  buildFollowUpMessage,
  runFollowUps
} = require('./crm_followup_runner');

const message = buildFollowUpMessage({
  name: 'Ahmed',
  interest: 'House'
});

assert.strictEqual(
  message,
  "Hi Ahmed, just following up regarding your House requirement. Let me know if you'd like to continue."
);

const fallback = buildFollowUpMessage({});

assert.ok(fallback.includes('there'));
assert.ok(fallback.includes('property'));

const due = runFollowUps([
  {
    phone: '+923001234567',
    name: 'Ahmed',
    interest: 'House',
    followup_days: 0
  }
], new Date());

assert.strictEqual(due.length, 1);
assert.ok(due[0].message.includes('Ahmed'));
assert.ok(due[0].message.includes('House'));

console.log('CRM FOLLOW-UP RUNNER TESTS: 100% PASSED');
