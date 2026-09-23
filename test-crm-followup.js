'use strict';

const assert = require('assert');
const {
  buildFollowUpMessage,
  shouldFollowUp
} = require('./crm_followup');

const lead = {
  name: 'Ahmed',
  phone: '+923009999999',
  interest: 'House',
  area: 'DHA Lahore',
  budget: '2 crore'
};

const message = buildFollowUpMessage(lead);

assert.ok(message.includes('Ahmed'));
assert.ok(message.includes('House'));
assert.ok(message.includes('DHA Lahore'));
assert.ok(message.includes('2 crore'));

assert.strictEqual(shouldFollowUp(lead), true);
assert.strictEqual(shouldFollowUp({}), false);
assert.strictEqual(
  shouldFollowUp({ ...lead, followup_status: 'completed' }),
  false
);

console.log('CRM FOLLOW-UP TESTS: 100% PASSED');
