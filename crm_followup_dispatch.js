'use strict';

const { runFollowUps } = require('./crm_followup_runner');

async function dispatchFollowUps(
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

  const followUps = runFollowUps(leads, now);
  const results = [];

  for (const followUp of followUps) {
    if (!followUp.phone) continue;

    try {
      const result = await sendMessage(
        followUp.phone,
        followUp.message
      );

      results.push({
        ...followUp,
        sent: true,
        result
      });
    } catch (error) {
      results.push({
        ...followUp,
        sent: false,
        error: error.message
      });
    }
  }

  return results;
}

module.exports = {
  dispatchFollowUps
};
