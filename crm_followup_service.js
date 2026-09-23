'use strict';

const { runFollowUps } = require('./crm_followup_runner');
const { dispatchFollowUps } = require('./crm_followup_dispatch');

async function processFollowUps(
  leads = [],
  sendMessage,
  now = new Date()
) {
  if (!Array.isArray(leads)) {
    throw new TypeError('leads must be an array');
  }

  if (typeof sendMessage !== 'function') {
    throw new TypeError('sendMessage must be a function');
  }

  const due = runFollowUps(leads, now);

  if (!due.length) {
    return {
      due: [],
      sent: [],
      failed: []
    };
  }

  const dispatched = await dispatchFollowUps(
    due,
    sendMessage,
    now
  );

  return {
    due,
    sent: dispatched.filter(item => item.sent === true),
    failed: dispatched.filter(item => item.sent === false)
  };
}

module.exports = {
  processFollowUps
};
