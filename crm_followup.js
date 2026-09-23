'use strict';

function buildFollowUpMessage(lead = {}) {
  const name = lead.name ? ` ${lead.name}` : '';
  const interest = lead.interest || 'property';
  const area = lead.area ? ` in ${lead.area}` : '';
  const budget = lead.budget ? ` around ${lead.budget}` : '';

  return `Hi${name}, just following up on your ${interest.toLowerCase()} requirement${area}${budget}. Are you still looking, or would you like me to update your requirements?`;
}

function shouldFollowUp(lead = {}) {
  if (!lead.phone) return false;
  if (lead.followup_status === 'completed') return false;
  return true;
}

module.exports = {
  buildFollowUpMessage,
  shouldFollowUp
};
