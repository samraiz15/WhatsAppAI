'use strict';

const { isFollowUpDue } = require('./crm_scheduler');

function runFollowUps(leads = [], now = new Date()) {
  if (!Array.isArray(leads)) {
    throw new TypeError('leads must be an array');
  }

  return leads
    .filter((lead) => isFollowUpDue(lead, now))
    .map((lead) => ({
      ...lead,
      message: buildFollowUpMessage(lead),
      sent: false
    }));
}

function buildFollowUpMessage(lead = {}) {
  const name = lead.name || 'there';
  const interest = lead.interest || 'property';

  return `Hi ${name}, just following up regarding your ${interest} requirement. Let me know if you'd like to continue.`;
}

module.exports = {
  runFollowUps,
  buildFollowUpMessage
};
